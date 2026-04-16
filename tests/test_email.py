import pytest
from unittest.mock import patch, MagicMock

pytestmark = pytest.mark.no_db


def test_send_email_confirmation_calls_send_with_token():
    with patch("api.email._send") as mock_send:
        from api.email import send_email_confirmation
        send_email_confirmation("user@example.com", "tok123abc")
        mock_send.assert_called_once()
        to, subject, html = mock_send.call_args[0]
        assert to == "user@example.com"
        assert subject == "Confirm your email address"
        assert "tok123abc" in html


def test_send_enquiry_notification_includes_name_and_message():
    enquiry = {
        "name": "Jane", "email": "jane@example.com",
        "phone": "555-1234", "message": "Do you have this in blue?",
        "size": "", "color": "",
    }
    with patch("api.email._send") as mock_send:
        from api.email import send_enquiry_notification
        send_enquiry_notification(enquiry, "admin@example.com", None)
        to, subject, html = mock_send.call_args[0]
        assert to == "admin@example.com"
        assert "Jane" in subject
        assert "Do you have this in blue?" in html


def test_send_enquiry_notification_includes_product_name_when_present():
    enquiry = {
        "name": "Jane", "email": "jane@example.com",
        "phone": "", "message": "Is this available?",
        "size": "M", "color": "Black",
    }
    with patch("api.email._send") as mock_send:
        from api.email import send_enquiry_notification
        send_enquiry_notification(enquiry, "admin@example.com", "Blue Linen Dress")
        _, _, html = mock_send.call_args[0]
        assert "Blue Linen Dress" in html
        assert "M" in html
        assert "Black" in html


def test_send_enquiry_confirmation_sends_to_customer():
    enquiry = {
        "name": "Jane", "email": "jane@example.com",
        "message": "Do you have size 10?", "size": "", "color": "",
    }
    with patch("api.email._send") as mock_send:
        from api.email import send_enquiry_confirmation
        send_enquiry_confirmation(enquiry, None)
        to, subject, html = mock_send.call_args[0]
        assert to == "jane@example.com"
        assert "enquiry" in subject.lower()
        assert "Jane" in html


def test_send_calls_smtp_ssl():
    """Integration: _send uses SMTP_SSL, logs in, and calls sendmail."""
    import smtplib
    with patch("smtplib.SMTP_SSL") as mock_cls:
        mock_server = MagicMock()
        mock_cls.return_value.__enter__ = MagicMock(return_value=mock_server)
        mock_cls.return_value.__exit__ = MagicMock(return_value=False)
        from api.email import _send
        _send("to@example.com", "Hello", "<p>Hi</p>")
        mock_server.login.assert_called_once()
        mock_server.sendmail.assert_called_once()
