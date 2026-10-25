from datetime import date, datetime, timezone as datetime_timezone

from django.test import SimpleTestCase, override_settings

from reportes.views import get_local_day_bounds


class LocalReportDayTests(SimpleTestCase):
	@override_settings(TIME_ZONE='America/Mexico_City')
	def test_day_bounds_follow_configured_timezone(self):
		utc_instant = datetime(2026, 10, 25, 2, 0, tzinfo=datetime_timezone.utc)

		report_date, start, end = get_local_day_bounds(utc_instant)

		self.assertEqual(report_date, date(2026, 10, 24))
		self.assertEqual(start, datetime(2026, 10, 24, 6, 0, tzinfo=datetime_timezone.utc))
		self.assertEqual(end, datetime(2026, 10, 25, 6, 0, tzinfo=datetime_timezone.utc))
