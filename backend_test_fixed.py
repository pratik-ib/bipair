#!/usr/bin/env python3

import requests
import json
import sys
import time
from typing import Dict, Any, Optional

class BipAirAPITester:
    def __init__(self):
        self.base_url = "https://bipair-chat.preview.emergentagent.com"
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

    def make_request(self, method: str, endpoint: str, headers: Dict = None, json_data: Dict = None, expect_json: bool = True) -> Dict:
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
            
            # If we don't expect JSON (e.g., PDF files), return different structure
            if not expect_json:
                return {
                    "status_code": response.status_code,
                    "content_type": response.headers.get("content-type", ""),
                    "content_length": len(response.content),
                    "headers": dict(response.headers)
                }
            
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
            # For endpoints that might return non-JSON content
            if not expect_json:
                return {
                    "status_code": response.status_code,
                    "content_type": response.headers.get("content-type", ""),
                    "content_length": len(response.content),
                    "headers": dict(response.headers)
                }
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

    def test_admin_logout_api(self):
        """Test admin logout API"""
        response = self.make_request("POST", "/api/auth/logout")
        
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Admin Logout API", "PASS")
            return True
        else:
            self.log_test(
                "Admin Logout API", 
                "FAIL",
                f"Status: {response['status_code']}, Data: {response['data']}"
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
        """Test admin flights API - GET operations"""
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

    def test_chatbot_flights_search_with_api_key(self):
        """Test chatbot flights search with API key"""
        headers = {"x-api-key": self.api_key}
        response = self.make_request(
            "GET", 
            "/api/flights/search?origin=DAR&destination=LHR&date=2025-06-15",
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

    def run_comprehensive_test(self):
        """Run comprehensive test of all critical endpoints"""
        print("🚀 Starting COMPREHENSIVE BipAir Backend API Tests...")
        print(f"Testing against: {self.base_url}")
        print("📋 TESTING ALL ENDPOINTS AS REQUESTED")
        print("=" * 80)
        
        # 1. AUTHENTICATION APIS
        print("\n1️⃣ Authentication APIs (Session-based, NO API key):")
        self.test_admin_auth_correct_credentials()
        self.test_admin_auth_wrong_credentials()
        self.test_admin_logout_api()
        
        # 2. ADMIN STATS & FLIGHTS
        print("\n2️⃣ Admin Core APIs:")
        self.test_admin_stats_api()
        self.test_admin_flights_api()
        
        # 3. CHATBOT APIS - MOST CRITICAL
        print("\n3️⃣ Chatbot APIs (REQUIRE x-api-key header):")
        self.test_chatbot_flights_search_with_api_key()
        self.test_chatbot_flights_search_without_api_key()
        
        # Test other critical endpoints
        print("\n4️⃣ Testing Additional Critical Endpoints:")
        
        # Admin bookings
        headers = {"x-api-key": self.api_key}
        response = self.make_request("GET", "/api/admin/bookings")
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Admin Bookings API", "PASS")
        else:
            self.log_test("Admin Bookings API", "FAIL", f"Status: {response['status_code']}")
            
        # Admin passengers
        response = self.make_request("GET", "/api/admin/passengers?page=1&limit=10")
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Admin Passengers API", "PASS")
        else:
            self.log_test("Admin Passengers API", "FAIL", f"Status: {response['status_code']}")
            
        # Admin payments
        response = self.make_request("GET", "/api/admin/payments?page=1&limit=10")
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Admin Payments API", "PASS")
        else:
            self.log_test("Admin Payments API", "FAIL", f"Status: {response['status_code']}")
            
        # Admin notifications
        response = self.make_request("GET", "/api/admin/notifications")
        if response["status_code"] == 200 and response["data"].get("success") is True:
            self.log_test("Admin Notifications API", "PASS")
        else:
            self.log_test("Admin Notifications API", "FAIL", f"Status: {response['status_code']}")

        # Chatbot bookings (test with non-existent PNR)
        response = self.make_request("GET", "/api/bookings/NOTEXIST", headers=headers)
        if response["status_code"] == 404:
            self.log_test("Chatbot Bookings API - Not Found", "PASS")
        else:
            self.log_test("Chatbot Bookings API - Not Found", "FAIL", f"Expected 404, got {response['status_code']}")

        # Passengers API (test with phone)
        response = self.make_request("GET", "/api/passengers/+254712345678", headers=headers)
        if response["status_code"] in [200, 404]:
            self.log_test("Passengers API - GET", "PASS")
        else:
            self.log_test("Passengers API - GET", "FAIL", f"Status: {response['status_code']}")

        # Check-in API
        response = self.make_request("GET", "/api/checkin/NOTEXIST", headers=headers)
        if response["status_code"] == 404:
            self.log_test("Check-in API", "PASS")
        else:
            self.log_test("Check-in API", "FAIL", f"Expected 404, got {response['status_code']}")

        # Payments initiate
        test_data = {"pnr": "TESTPNR"}
        response = self.make_request("POST", "/api/payments/initiate", headers=headers, json_data=test_data)
        if response["status_code"] in [200, 404]:
            self.log_test("Payments Initiate API", "PASS")
        else:
            self.log_test("Payments Initiate API", "FAIL", f"Status: {response['status_code']}")

        # PDF APIs (test error handling)
        print("\n5️⃣ PDF Generation APIs:")
        response = self.make_request("GET", "/api/ticket/NOTEXIST", expect_json=False)
        if response["status_code"] in [404, 500]:
            self.log_test("PDF Ticket API", "PASS", f"Error handling: {response['status_code']}")
        else:
            self.log_test("PDF Ticket API", "FAIL", f"Status: {response['status_code']}")

        response = self.make_request("GET", "/api/boarding-pass/NOTEXIST", expect_json=False)
        if response["status_code"] in [404, 500]:
            self.log_test("PDF Boarding Pass API", "PASS", f"Error handling: {response['status_code']}")
        else:
            self.log_test("PDF Boarding Pass API", "FAIL", f"Status: {response['status_code']}")

        # Print detailed summary
        print("\n" + "=" * 80)
        print("📊 COMPREHENSIVE TEST SUMMARY:")
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
        
        # Critical analysis
        print(f"\n🔍 CRITICAL ANALYSIS:")
        if success_rate >= 90:
            print("   🟢 EXCELLENT: All core systems functional")
        elif success_rate >= 70:
            print("   🟡 GOOD: Minor issues, core functionality works")
        elif success_rate >= 50:
            print("   🟠 PARTIAL: Some core systems failing, needs attention")
        else:
            print("   🔴 CRITICAL: Major system failures, immediate fix needed")
        
        return self.results

if __name__ == "__main__":
    tester = BipAirAPITester()
    results = tester.run_comprehensive_test()
    
    # Exit with error code if any tests failed
    sys.exit(0 if results['failed'] == 0 else 1)