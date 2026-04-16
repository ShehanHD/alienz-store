import html as html_module
import logging
import smtplib
from contextlib import contextmanager
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from api.config import settings

logger = logging.getLogger(__name__)


@contextmanager
def _smtp_connection():
    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        yield server


def _send(to: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.from_email
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    with _smtp_connection() as server:
        server.sendmail(settings.from_email, to, msg.as_string())


def send_email_confirmation(to_email: str, token: str) -> None:
    safe_token = html_module.escape(token)
    confirm_url = f"{settings.frontend_url}/auth/confirm-email?token={safe_token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>Confirm your email address</h2>
        <p>Thanks for registering. Click the button below to confirm your email and activate your account.</p>
        <p>
            <a href="{confirm_url}"
               style="display:inline-block;padding:12px 24px;background:#000;color:#fff;
                      text-decoration:none;border-radius:6px;">
                Confirm Email
            </a>
        </p>
        <p style="color:#666;font-size:14px;">
            This link expires in 24 hours. If you didn't register, you can safely ignore this email.
        </p>
    </div>
    """
    _send(to_email, "Confirm your email address", html)


def send_enquiry_notification(
    enquiry: dict, admin_email: str, product_name: str | None
) -> None:
    e = html_module.escape
    product_rows = ""
    if product_name:
        product_rows = f"""
            <tr><td><strong>Product</strong></td><td>{e(product_name)}</td></tr>
            <tr><td><strong>Size</strong></td><td>{e(enquiry.get("size") or "—")}</td></tr>
            <tr><td><strong>Color</strong></td><td>{e(enquiry.get("color") or "—")}</td></tr>
        """
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>New enquiry from {e(enquiry["name"])}</h2>
        <table style="border-collapse:collapse;width:100%;font-size:15px;">
            <tr><td style="padding:6px 12px 6px 0"><strong>Name</strong></td>
                <td>{e(enquiry["name"])}</td></tr>
            <tr><td style="padding:6px 12px 6px 0"><strong>Email</strong></td>
                <td>{e(enquiry["email"])}</td></tr>
            <tr><td style="padding:6px 12px 6px 0"><strong>Phone</strong></td>
                <td>{e(enquiry.get("phone") or "—")}</td></tr>
            {product_rows}
            <tr><td style="padding:6px 12px 6px 0"><strong>Message</strong></td>
                <td>{e(enquiry.get("message") or "—")}</td></tr>
        </table>
        <p style="margin-top:24px;">
            <a href="{settings.frontend_url}/admin/enquiries">View in admin panel →</a>
        </p>
    </div>
    """
    safe_name = enquiry['name'].replace('\r', '').replace('\n', '')
    _send(admin_email, f"New enquiry from {safe_name}", html)


def send_enquiry_confirmation(enquiry: dict, product_name: str | None) -> None:
    e = html_module.escape
    product_section = ""
    if product_name:
        product_section = f"""
        <p>
            <strong>Product:</strong> {e(product_name)}<br>
            <strong>Size:</strong> {e(enquiry.get("size") or "—")}<br>
            <strong>Color:</strong> {e(enquiry.get("color") or "—")}
        </p>
        """
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2>We received your enquiry</h2>
        <p>Hi {e(enquiry["name"])}, thanks for reaching out. We'll be in touch soon.</p>
        <h3 style="margin-top:24px;">Your enquiry details</h3>
        {product_section}
        <p><strong>Message:</strong> {e(enquiry.get("message") or "—")}</p>
    </div>
    """
    _send(enquiry["email"], "We received your enquiry", html)
