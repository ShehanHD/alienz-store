import html as html_module
import logging
import re
import smtplib
from contextlib import contextmanager
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from api.config import settings

logger = logging.getLogger(__name__)

_TEMPLATE_DIR = Path(__file__).parent / "emails" / "dist"

# Shared table cell styles (must match what the MJML templates use)
_LABEL_STYLE = (
    "padding:10px 20px 10px 0;color:#888888;width:120px;"
    "font-size:12px;text-transform:uppercase;letter-spacing:1px;"
)
_VALUE_STYLE = "padding:10px 0;"
_VALUE_STYLE_BOLD = "padding:10px 0;font-weight:600;"
_ROW_BORDER = "border-bottom:1px solid #e8e8e8;"


def _load_template(name: str) -> str:
    return (_TEMPLATE_DIR / name).read_text(encoding="utf-8")


def _product_rows(enquiry: dict, product_name: str) -> str:
    e = html_module.escape
    return (
        f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Product</td>'
        f'<td style="{_VALUE_STYLE}">{e(product_name)}</td></tr>'
        f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Size</td>'
        f'<td style="{_VALUE_STYLE}">{e(enquiry.get("size") or "—")}</td></tr>'
        f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Color</td>'
        f'<td style="{_VALUE_STYLE}">{e(enquiry.get("color") or "—")}</td></tr>'
    )


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
    confirm_url = f"{settings.site_url}/auth/confirm-email?token={token}"
    html = _load_template("email-confirmation.html").replace("__CONFIRM_URL__", confirm_url)
    _send(to_email, "Confirm your email address", html)


def send_enquiry_notification(
    enquiry: dict, admin_email: str, product_name: str | None
) -> None:
    e = html_module.escape
    admin_url = f"{settings.site_url}/admin/enquiries"
    rows = _product_rows(enquiry, product_name) if product_name else ""
    html = (
        _load_template("enquiry-notification.html")
        .replace("__NAME__", e(enquiry["name"]))
        .replace("__EMAIL__", e(enquiry["email"]))
        .replace("__PHONE__", e(enquiry.get("phone") or "—"))
        .replace("__PRODUCT_ROWS__", rows)
        .replace("__MESSAGE__", e(enquiry.get("message") or "—"))
        .replace("__ADMIN_URL__", admin_url)
    )
    safe_name = enquiry["name"].replace("\r", "").replace("\n", "")
    _send(admin_email, f"New enquiry from {safe_name}", html)


def _invoice_rows(enquiry: dict, product: dict | None) -> str:
    e = html_module.escape
    rows = ""
    if product:
        rows += (
            f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Product</td>'
            f'<td style="{_VALUE_STYLE}">{e(str(product["name"]))}</td></tr>'
        )
    if enquiry.get("size"):
        rows += (
            f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Size</td>'
            f'<td style="{_VALUE_STYLE}">{e(enquiry["size"])}</td></tr>'
        )
    if enquiry.get("color"):
        rows += (
            f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Color</td>'
            f'<td style="{_VALUE_STYLE}">{e(enquiry["color"])}</td></tr>'
        )
    quantity = int(enquiry.get("quantity") or 1)
    rows += (
        f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Quantity</td>'
        f'<td style="{_VALUE_STYLE}">{quantity}</td></tr>'
    )
    if product and product.get("price") is not None:
        unit_price = float(product["price"])
        total = unit_price * quantity
        rows += (
            f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Unit price</td>'
            f'<td style="{_VALUE_STYLE}">${unit_price:.2f}</td></tr>'
            f'<tr style="{_ROW_BORDER}"><td style="{_LABEL_STYLE}">Total</td>'
            f'<td style="{_VALUE_STYLE_BOLD}">${total:.2f}</td></tr>'
        )
    rows += (
        f'<tr><td style="{_LABEL_STYLE}">Shipping</td>'
        f'<td style="{_VALUE_STYLE}">We will contact you to arrange delivery and discuss shipping costs.</td></tr>'
    )
    return rows


def send_enquiry_accepted(enquiry: dict, product: dict | None) -> None:
    e = html_module.escape
    invoice_rows = _invoice_rows(enquiry, product)
    raw = _load_template("enquiry-accepted.html")
    image_url = product.get("thumbnail_url") if product else None
    if image_url:
        raw = raw.replace("__PRODUCT_IMAGE__", html_module.escape(image_url))
        raw = raw.replace("%%PRODUCT_IMAGE_START%%", "").replace("%%PRODUCT_IMAGE_END%%", "")
    else:
        raw = re.sub(r"%%PRODUCT_IMAGE_START%%.*?%%PRODUCT_IMAGE_END%%", "", raw, flags=re.DOTALL)
    html = (
        raw.replace("__NAME__", e(enquiry["name"]))
           .replace("__INVOICE_ROWS__", invoice_rows)
    )
    safe_name = enquiry["name"].replace("\r", "").replace("\n", "")
    _send(enquiry["email"], f"Your enquiry has been accepted — {safe_name}", html)


def send_enquiry_rejected(enquiry: dict) -> None:
    e = html_module.escape
    reason = enquiry.get("rejection_reason") or "No specific reason provided."
    html = (
        _load_template("enquiry-rejected.html")
        .replace("__NAME__", e(enquiry["name"]))
        .replace("__REJECTION_REASON__", e(reason))
    )
    _send(enquiry["email"], "Regarding your enquiry", html)


def send_enquiry_confirmation(enquiry: dict, product_name: str | None) -> None:
    e = html_module.escape
    rows = _product_rows(enquiry, product_name) if product_name else ""
    html = (
        _load_template("enquiry-confirmation.html")
        .replace("__NAME__", e(enquiry["name"]))
        .replace("__PRODUCT_ROWS__", rows)
        .replace("__MESSAGE__", e(enquiry.get("message") or "—"))
    )
    _send(enquiry["email"], "We received your enquiry", html)
