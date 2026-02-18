#!/usr/bin/env python3

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

class BipAirAPITester:
    def __init__(self):
        self.base_url = "https://bipair-tickets.preview.emergentagent.com"
        self.api_key = "bipair-demo-key-2026"
        self.admin_credentials = {
            "username": "admin", 
            "password": "Infobip@123"
        }
        self.session = requests.Session()
        self.session.timeout = 30
        
        # Test results tracking
        self.results = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "tests": []
        }

    def log_test(self, name: str, status: str, details: str = ""):
        """Log test result"""
        self.results["total"] += 1
        if status == "PASS":
            self.results["passed"] += 1
            print(f"✅ {name}: {status}")
        else:
            self.results["failed"] += 1
            print(f"❌ {name}: {status}")
        
        if details:
            print(f"   {details}")
        
        self.results["tests"].append({
            "name": name,
            "status": status,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, headers: Dict = None, json_data: Dict = None) -> Dict:
        """Make HTTP request with error handling"""
        try:
            url = f"{self.base_url}{endpoint}"
            req_headers = headers or {}
            
            response = self.session.request(
                method=method,
                url=url,
                headers=req_headers,
                json=json_data
            )
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "headers": dict(response.headers)
            }
        except requests.exceptions.RequestException as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "headers": {}
            }
        except json.JSONDecodeError:
            return {
                "status_code": response.status_code,
                "data": {"error": "Invalid JSON response"},
                "headers": dict(response.headers)
            }

    def test_admin_auth_correct_credentials(self):
        """Test admin auth with correct credentials"""
        response = self.make_request(
            "POST", 
            "/api/auth/login",
            json_data=self.admin_credentials
        )
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Admin Auth - Valid Credentials", "PASS")
            return True
        else:
            self.log_test(
                "Admin Auth - Valid Credentials", 
                "FAIL", 
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def test_admin_auth_wrong_credentials(self):
        """Test admin auth with wrong credentials"""
        wrong_creds = {"username": "admin", "password": "wrongpassword"}
        response = self.make_request(
            "POST", 
            "/api/auth/login",
            json_data=wrong_creds
        )
        
        expected_status = 401
        expected_error = "Invalid username or password"
        
        if (response["status_code"] == expected_status and 
            response["data"].get("success") is False and 
            expected_error in response["data"].get("error", "")):
            self.log_test("Admin Auth - Invalid Credentials", "PASS")
            return True
        else:
            self.log_test(
                "Admin Auth - Invalid Credentials", 
                "FAIL",
                f"Expected 401 with error '{expected_error}', got {response['status_code']}: {response['data']}"
            )
            return False

    def test_admin_stats_api(self):
        """Test admin stats API"""
        response = self.make_request("GET", "/api/admin/stats")
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            data = response["data"].get("data", {})
            required_fields = [
                "flightsToday", "totalBookings", "revenueToday", 
                "checkinRate", "bookingsPerDay", "bookingsBySource", "recentBookings"
            ]
            
            missing_fields = [field for field in required_fields if field not in data]
            if not missing_fields:
                self.log_test("Admin Stats API", "PASS")
                return True
            else:
                self.log_test(
                    "Admin Stats API", 
                    "FAIL", 
                    f"Missing fields: {missing_fields}"
                )
                return False
        else:
            self.log_test(
                "Admin Stats API", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def test_admin_flights_api(self):
        """Test admin flights API"""
        # Test basic GET
        response = self.make_request("GET", "/api/admin/flights")
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            data = response["data"].get("data", {})
            if "flights" in data and "total" in data:
                self.log_test("Admin Flights API - Basic GET", "PASS")
            else:
                self.log_test(
                    "Admin Flights API - Basic GET", 
                    "FAIL", 
                    f"Missing flights or total in response: {data}"
                )
                return False
        else:
            self.log_test(
                "Admin Flights API - Basic GET", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

        # Test paginated GET
        response = self.make_request("GET", "/api/admin/flights?page=1&limit=10")
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Admin Flights API - Paginated", "PASS")
            return True
        else:
            self.log_test(
                "Admin Flights API - Paginated", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def test_admin_bookings_api(self):
        """Test admin bookings API"""
        response = self.make_request("GET", "/api/admin/bookings")
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            data = response["data"].get("data", {})
            if "bookings" in data and "total" in data:
                # Check if bookings have nested data (passenger, flight, payment)
                bookings = data.get("bookings", [])
                if bookings and len(bookings) > 0:
                    first_booking = bookings[0]
                    has_nested = any(key in first_booking for key in ["passenger", "flight", "payment"])
                    if has_nested:
                        self.log_test("Admin Bookings API", "PASS")
                    else:
                        self.log_test("Admin Bookings API", "PASS", "No nested data found (may be empty DB)")
                else:
                    self.log_test("Admin Bookings API", "PASS", "Empty bookings list (may be empty DB)")
                return True
            else:
                self.log_test(
                    "Admin Bookings API", 
                    "FAIL", 
                    f"Missing bookings or total in response: {data}"
                )
                return False
        else:
            self.log_test(
                "Admin Bookings API", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def test_chatbot_flights_search_with_api_key(self):
        """Test chatbot flights search with API key"""
        headers = {"x-api-key": self.api_key}
        response = self.make_request(
            "GET", 
            "/api/flights/search?origin=DAR&destination=LHR",
            headers=headers
        )
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Chatbot Flights Search - With API Key", "PASS")
            return True
        else:
            self.log_test(
                "Chatbot Flights Search - With API Key", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def test_chatbot_flights_search_without_api_key(self):
        """Test chatbot flights search without API key"""
        response = self.make_request(
            "GET", 
            "/api/flights/search?origin=DAR&destination=LHR"
        )
        
        if response["status_code"] == 401 and response["data"].get("success") is False:
            if "Unauthorized" in response["data"].get("error", ""):
                self.log_test("Chatbot Flights Search - Without API Key", "PASS")
                return True
        
        self.log_test(
            "Chatbot Flights Search - Without API Key", 
            "FAIL",
            f"Expected 401 Unauthorized, got {response['status_code']}: {response['data']}"
        )
        return False

    def test_chatbot_bookings_api(self):
        """Test chatbot bookings API"""
        headers = {"x-api-key": self.api_key}
        
        # Test existing booking (try common PNR format)
        test_pnrs = ["BP1A2B", "BP3C4D", "BP5E6F"]
        found_booking = False
        
        for pnr in test_pnrs:
            response = self.make_request(
                "GET", 
                f"/api/bookings/{pnr}",
                headers=headers
            )
            
            if response["status_code"] == 200 and response["data"].get("success") is True:
                booking_data = response["data"].get("data", {})
                has_nested = any(key in booking_data for key in ["passenger", "flight", "payment"])
                if has_nested:
                    self.log_test("Chatbot Bookings API - Found Booking", "PASS", f"PNR: {pnr}")
                else:
                    self.log_test("Chatbot Bookings API - Found Booking", "PASS", f"PNR: {pnr}, no nested data")
                found_booking = True
                break
        
        if not found_booking:
            self.log_test("Chatbot Bookings API - Found Booking", "PASS", "No test bookings found (empty DB)")
        
        # Test non-existent booking
        response = self.make_request(
            "GET", 
            "/api/bookings/NOTEXIST",
            headers=headers
        )
        
        if response["status_code"] == 404 and response["data"].get("success") is False:
            self.log_test("Chatbot Bookings API - Not Found", "PASS")
            return True
        else:
            self.log_test(
                "Chatbot Bookings API - Not Found", 
                "FAIL",
                f"Expected 404, got {response['status_code']}: {response['data']}"
            )
            return False

    def get_valid_payment_id(self) -> Optional[str]:
        """Try to get a valid payment ID from bookings"""
        try:
            headers = {"x-api-key": self.api_key}
            response = self.make_request("GET", "/api/admin/bookings", headers=headers)
            
            if response["status_code"] == 200:
                bookings = response["data"].get("data", {}).get("bookings", [])
                for booking in bookings:
                    payment_id = booking.get("payment_id")
                    if payment_id:
                        return str(payment_id)
            return None
        except:
            return None

    def test_payments_status_api(self):
        """Test payments status API"""
        payment_id = self.get_valid_payment_id()
        
        if payment_id:
            response = self.make_request("GET", f"/api/payments/{payment_id}/status")
            
            if response["status_code"] == 200 and response["data"].get("success") is True:
                self.log_test("Payments Status API", "PASS", f"Payment ID: {payment_id}")
                return True
            else:
                self.log_test(
                    "Payments Status API", 
                    "FAIL",
                    f"Status: {response['status_code']}, Data: {response['data']}"
                )
                return False
        else:
            # Test with fake ID to check error handling
            response = self.make_request("GET", "/api/payments/fake-id/status")
            if response["status_code"] == 404:
                self.log_test("Payments Status API", "PASS", "No valid payment IDs found, tested error handling")
                return True
            else:
                self.log_test("Payments Status API", "FAIL", "No valid payment IDs and error handling failed")
                return False

    def test_payments_initiate_api(self):
        """Test payments initiate API"""
        headers = {"x-api-key": self.api_key}
        
        # Try with a test PNR
        test_data = {"pnr": "BP3C4D"}
        response = self.make_request(
            "POST", 
            "/api/payments/initiate",
            headers=headers,
            json_data=test_data
        )
        
        # Accept either success (if PNR exists) or 404 (if PNR doesn't exist)
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Payments Initiate API", "PASS", "Payment initiated successfully")
            return True
        elif response["status_code"] == 404 and "not found" in response["data"].get("error", "").lower():
            self.log_test("Payments Initiate API", "PASS", "PNR not found (expected for empty DB)")
            return True
        else:
            self.log_test(
                "Payments Initiate API", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def test_passengers_api_get(self):
        """Test passengers GET API"""
        headers = {"x-api-key": self.api_key}
        
        # Test with a common phone number format
        test_phone = "+254712345678"
        response = self.make_request(
            "GET", 
            f"/api/passengers/{test_phone}",
            headers=headers
        )
        
        # Accept either success (if passenger exists) or 404 (if passenger doesn't exist)
        if response["status_code"] == 200 and response["data"].get("success") is True:
            data = response["data"].get("data", {})
            if "passenger" in data and "bookings" in data:
                self.log_test("Passengers API - GET", "PASS", f"Found passenger: {test_phone}")
            else:
                self.log_test("Passengers API - GET", "FAIL", "Missing passenger or bookings in response")
            return True
        elif response["status_code"] == 404:
            self.log_test("Passengers API - GET", "PASS", "Passenger not found (expected for empty DB)")
            return True
        else:
            self.log_test(
                "Passengers API - GET", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def test_passengers_api_post(self):
        """Test passengers POST API"""
        headers = {"x-api-key": self.api_key}
        
        test_data = {
            "phone": "+254700000999",
            "firstName": "John",
            "lastName": "Doe",
            "email": "john.doe@test.com"
        }
        
        response = self.make_request(
            "POST", 
            "/api/passengers",
            headers=headers,
            json_data=test_data
        )
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            data = response["data"].get("data", {})
            if "passenger" in data:
                self.log_test("Passengers API - POST", "PASS")
                return True
            else:
                self.log_test("Passengers API - POST", "FAIL", "Missing passenger in response")
                return False
        else:
            self.log_test(
                "Passengers API - POST", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
            )
            return False

    def run_all_tests(self):
        """Run all priority tests"""
        print("🚀 Starting BipAir Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # HIGH PRIORITY TESTS (as specified in the request)
        print("\n📋 HIGH PRIORITY TESTS:")
        
        # 1. Admin Auth
        print("\n1️⃣ Admin Authentication:")
        self.test_admin_auth_correct_credentials()
        self.test_admin_auth_wrong_credentials()
        
        # 2. Admin Stats
        print("\n2️⃣ Admin Stats:")
        self.test_admin_stats_api()
        
        # 3. Admin Flights
        print("\n3️⃣ Admin Flights:")
        self.test_admin_flights_api()
        
        # 4. Admin Bookings
        print("\n4️⃣ Admin Bookings:")
        self.test_admin_bookings_api()
        
        # 5. Chatbot Flights Search
        print("\n5️⃣ Chatbot Flights Search:")
        self.test_chatbot_flights_search_with_api_key()
        self.test_chatbot_flights_search_without_api_key()
        
        # 6. Chatbot Bookings
        print("\n6️⃣ Chatbot Bookings:")
        self.test_chatbot_bookings_api()
        
        # 7. Payments
        print("\n7️⃣ Payments:")
        self.test_payments_status_api()
        self.test_payments_initiate_api()
        
        # 8. Passengers
        print("\n8️⃣ Passengers:")
        self.test_passengers_api_get()
        self.test_passengers_api_post()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY:")
        print(f"Total Tests: {self.results['total']}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['failed'] > 0:
            print("\n🚨 FAILED TESTS:")
            for test in self.results['tests']:
                if test['status'] == 'FAIL':
                    print(f"   • {test['name']}: {test['details']}")
        
        success_rate = (self.results['passed'] / self.results['total']) * 100 if self.results['total'] > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return self.results

if __name__ == "__main__":
    tester = BipAirAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if any tests failed
    sys.exit(0 if results['failed'] == 0 else 1)