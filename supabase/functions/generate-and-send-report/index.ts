
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ServiceReport {
  id: string;
  equipment_type: string;
  equipment_model?: string;
  equipment_serial?: string;
  service_description: string;
  findings?: string;
  recommendations?: string;
  technician_name: string;
  service_date: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  photos?: Array<{
    photo_url: string;
    order_index: number;
  }>;
}

const generatePDFContent = (report: ServiceReport): string => {
  const photoHtml = report.photos?.map(photo => 
    `<img src="${photo.photo_url}" style="max-width: 200px; margin: 10px 0; border: 1px solid #ddd;" alt="Service photo" />`
  ).join('') || '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #333; text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
        Australian Vacuum Services - Service Report
      </h1>
      
      <div style="margin: 20px 0;">
        <h2 style="color: #007bff;">Report Information</h2>
        <p><strong>Report ID:</strong> ${report.id}</p>
        <p><strong>Service Date:</strong> ${new Date(report.service_date).toLocaleDateString()}</p>
        <p><strong>Technician:</strong> ${report.technician_name}</p>
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #007bff;">Customer Information</h2>
        <p><strong>Name:</strong> ${report.customer.name}</p>
        <p><strong>Email:</strong> ${report.customer.email}</p>
        ${report.customer.phone ? `<p><strong>Phone:</strong> ${report.customer.phone}</p>` : ''}
        ${report.customer.address ? `<p><strong>Address:</strong> ${report.customer.address}</p>` : ''}
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #007bff;">Equipment Information</h2>
        <p><strong>Type:</strong> ${report.equipment_type}</p>
        ${report.equipment_model ? `<p><strong>Model:</strong> ${report.equipment_model}</p>` : ''}
        ${report.equipment_serial ? `<p><strong>Serial Number:</strong> ${report.equipment_serial}</p>` : ''}
      </div>

      <div style="margin: 20px 0;">
        <h2 style="color: #007bff;">Service Details</h2>
        <p><strong>Description:</strong></p>
        <p style="background: #f8f9fa; padding: 10px; border-left: 4px solid #007bff;">${report.service_description}</p>
        
        ${report.findings ? `
        <p><strong>Findings:</strong></p>
        <p style="background: #f8f9fa; padding: 10px; border-left: 4px solid #28a745;">${report.findings}</p>
        ` : ''}
        
        ${report.recommendations ? `
        <p><strong>Recommendations:</strong></p>
        <p style="background: #f8f9fa; padding: 10px; border-left: 4px solid #ffc107;">${report.recommendations}</p>
        ` : ''}
      </div>

      ${photoHtml ? `
      <div style="margin: 20px 0;">
        <h2 style="color: #007bff;">Service Photos</h2>
        <div style="text-align: center;">
          ${photoHtml}
        </div>
      </div>
      ` : ''}

      <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
        <p>This report was generated on ${new Date().toLocaleDateString()}</p>
        <p>Australian Vacuum Services - Professional Equipment Maintenance</p>
      </div>
    </div>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportId } = await req.json();

    if (!reportId) {
      throw new Error('Report ID is required');
    }

    console.log('Fetching report data for:', reportId);

    // Fetch the service report with customer data and photos
    const { data: reportData, error: reportError } = await supabase
      .from('service_reports')
      .select(`
        *,
        customer:customers(name, email, phone, address),
        photos:service_report_photos(photo_url, order_index)
      `)
      .eq('id', reportId)
      .single();

    if (reportError) throw reportError;
    if (!reportData) throw new Error('Report not found');

    console.log('Report data fetched successfully');

    const report: ServiceReport = {
      ...reportData,
      customer: reportData.customer,
      photos: reportData.photos?.sort((a, b) => a.order_index - b.order_index) || []
    };

    // Generate PDF content (HTML that can be converted to PDF)
    const pdfContent = generatePDFContent(report);

    console.log('Sending email with PDF attachment');

    // Send email with PDF content to yourself instead of customer
    const emailResponse = await resend.emails.send({
      from: "Service Reports <onboarding@resend.dev>",
      to: ["info@australianvacuumservices.com"], // Send to yourself
      subject: `Service Report - ${report.customer.name} - ${report.equipment_type} (${new Date(report.service_date).toLocaleDateString()})`,
      html: `
        <h2>Service Report Completed</h2>
        <p>A service report has been completed for customer: <strong>${report.customer.name}</strong></p>
        <p>Equipment: ${report.equipment_type} ${report.equipment_model || ''}</p>
        <p>Service Date: ${new Date(report.service_date).toLocaleDateString()}</p>
        <p>Technician: ${report.technician_name}</p>
        
        <h3>PDF Report Content:</h3>
        ${pdfContent}
      `,
    });

    if (emailResponse.error) {
      console.error('Resend error:', emailResponse.error);
      throw new Error(`Email sending failed: ${emailResponse.error.message}`);
    }

    console.log("Email sent successfully:", emailResponse.data?.id);

    // Update report status to completed if it was a draft
    if (reportData.status === 'draft') {
      const { error: updateError } = await supabase
        .from('service_reports')
        .update({ status: 'completed' })
        .eq('id', reportId);

      if (updateError) {
        console.error('Error updating report status:', updateError);
        // Don't throw error here as email was successful
      } else {
        console.log('Report status updated to completed');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Report generated and sent successfully to admin',
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in generate-and-send-report function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
