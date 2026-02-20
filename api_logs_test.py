#!/usr/bin/env python3
"""
API Request Logs Feature Test Script for BipAir
Tests the new API request logging functionality as specified in the review request.
"""
import requests
import json
import sys
import time
from typing import Optional, Dict, Any, Tuple

# Configuration
BASE_URL = "http://localhost:3000"
API_KEY = "bipair-demo-key-2026"
ADMIN_CREDS = {"username": "admin", "password": "Infobip@123"}
HEADERS = {"x-api-key": API_KEY}

def print_test_result(test_name: str, success: bool, details: str = ""):
    """Print formatted test result"""
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"\n{status}: {test_name}")
    if details:
        print(f"   {details}")

def make_api_request(method: str, endpoint: str, headers: Dict[str, str] = None, data: Dict[str, Any] = None, cookies: Dict[str, str] = None) -> Tuple[bool, Optional[requests.Response], int]:
    """Make API request and return (success, response, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers or {}
    
    try:
        session = requests.Session()
        if cookies:
            session.cookies.update(cookies)
            
        if method.upper() == "GET":
            response = session.get(url, headers=req_headers)
        elif method.upper() == "POST":
            response = session.post(url, headers=req_headers, json=data)
        elif method.upper() == "PATCH":
            response = session.patch(url, headers=req_headers, json=data)
        else:
            return False, None, 0
            
        return True, response, response.status_code
    except Exception as e:
        print(f"   Request failed: {str(e)}")
        return False, None, 0

def get_admin_session() -> Optional[Dict[str, str]]:
    """Login as admin and get session cookies"""
    print("\n🔐 Logging in as admin...")
    
    success, response, status_code = make_api_request(
        "POST", "/api/auth/login", data=ADMIN_CREDS
    )
    
    if success and status_code == 200:
        try:
            data = response.json()
            if data.get("success"):
                cookies = dict(response.cookies)
                print(f"   ✅ Admin login successful")
                return cookies
        except:
            pass
    
    print(f"   ❌ Admin login failed (status: {status_code})")
    return None

def test_admin_logs_no_auth():
    """Test 1: Admin logs endpoint without authentication should return 401"""
    test_name = "Admin logs API without auth (should return 401)"
    
    success, response, status_code = make_api_request("GET", "/api/admin/logs")
    
    if success and status_code == 401:
        try:
            result = response.json()
            if not result.get("success") and "Unauthorized" in result.get("error", ""):
                print_test_result(test_name, True, "Correctly returned 401 Unauthorized")
                return True
        except:
            pass
    
    error_msg = f"Expected 401, got {status_code}"
    if success and response:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False

def test_admin_logs_with_auth(admin_cookies: Dict[str, str]):
    """Test 2: Admin logs endpoint with valid admin session"""
    test_name = "Admin logs API with valid auth"
    
    success, response, status_code = make_api_request(
        "GET", "/api/admin/logs", cookies=admin_cookies
    )
    
    if success:
        try:
            result = response.json()
            if status_code == 200:
                # Table exists case
                if result.get("success") and "data" in result:
                    print_test_result(test_name, True, f"Table exists: returned {len(result.get('data', []))} logs, total: {result.get('total', 0)}")
                    return True, "table_exists"
            elif status_code == 503:
                # Table doesn't exist case
                if not result.get("success") and result.get("setupRequired"):
                    print_test_result(test_name, True, "Table missing: correctly returned setupRequired=true with 503")
                    return True, "table_missing"
        except Exception as e:
            print(f"   JSON parsing error: {e}")
    
    error_msg = f"Status: {status_code}"
    if success and response:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False, None

def test_chatbot_apis_not_broken():
    """Test 3: Ensure chatbot APIs still work correctly with logging"""
    print("\n" + "="*60)
    print("TESTING CHATBOT APIs - Ensuring logging doesn't break functionality")
    print("="*60)
    
    test_results = []
    
    # Test 1: GET /api/flights/search with API key
    test_name = "GET /api/flights/search with API key"
    success, response, status_code = make_api_request(
        "GET", "/api/flights/search?origin=NYC", HEADERS
    )
    if success and status_code == 200:
        try:
            result = response.json()
            if result.get("success") and "data" in result:
                print_test_result(test_name, True, "Flight search API working correctly")
                test_results.append(True)
            else:
                print_test_result(test_name, False, f"Invalid response structure: {result}")
                test_results.append(False)
        except:
            print_test_result(test_name, False, f"JSON parsing failed: {response.text[:100]}")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 200, got {status_code}")
        test_results.append(False)
    
    # Test 2: GET /api/bookings/FAKEPNR999 with API key (should return 404)
    test_name = "GET /api/bookings/FAKEPNR999 with API key (should return 404)"
    success, response, status_code = make_api_request(
        "GET", "/api/bookings/FAKEPNR999", HEADERS
    )
    if success and status_code == 404:
        try:
            result = response.json()
            if not result.get("success"):
                print_test_result(test_name, True, "Correctly returned 404 for non-existent PNR")
                test_results.append(True)
            else:
                print_test_result(test_name, False, f"Should return success=false: {result}")
                test_results.append(False)
        except:
            print_test_result(test_name, False, f"JSON parsing failed")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 404, got {status_code}")
        test_results.append(False)
    
    # Test 3: PATCH /api/bookings/FAKEPNR999 with API key (should return 404, not 500)
    test_name = "PATCH /api/bookings/FAKEPNR999 with API key (should return 404)"
    success, response, status_code = make_api_request(
        "PATCH", "/api/bookings/FAKEPNR999", HEADERS, {"specialRequests": "test"}
    )
    if success and status_code == 404:
        try:
            result = response.json()
            if not result.get("success"):
                print_test_result(test_name, True, "Correctly returned 404 for non-existent PNR")
                test_results.append(True)
            else:
                print_test_result(test_name, False, f"Should return success=false")
                test_results.append(False)
        except:
            print_test_result(test_name, False, f"JSON parsing failed")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 404, got {status_code}")
        test_results.append(False)
    
    # Test 4: POST /api/bookings without API key (should return 401)
    test_name = "POST /api/bookings without API key (should return 401)"
    success, response, status_code = make_api_request(
        "POST", "/api/bookings", data={}
    )
    if success and status_code == 401:
        try:
            result = response.json()
            if not result.get("success") and "Unauthorized" in result.get("error", ""):
                print_test_result(test_name, True, "Correctly returned 401 for missing API key")
                test_results.append(True)
            else:
                print_test_result(test_name, False, f"Wrong error message: {result}")
                test_results.append(False)
        except:
            print_test_result(test_name, False, f"JSON parsing failed")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 401, got {status_code}")
        test_results.append(False)
    
    # Test 5: POST /api/checkin/FAKEPNR with API key (should return 404 or 400)
    test_name = "POST /api/checkin/FAKEPNR with API key (should return 404 or 400)"
    success, response, status_code = make_api_request(
        "POST", "/api/checkin/FAKEPNR", HEADERS, {}
    )
    if success and status_code in [400, 404]:
        try:
            result = response.json()
            if not result.get("success"):
                print_test_result(test_name, True, f"Correctly returned {status_code} for invalid checkin")
                test_results.append(True)
            else:
                print_test_result(test_name, False, f"Should return success=false")
                test_results.append(False)
        except:
            print_test_result(test_name, False, f"JSON parsing failed")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 400/404, got {status_code}")
        test_results.append(False)
    
    # Test 6: POST /api/passengers with API key and empty body (should return error, not 500)
    test_name = "POST /api/passengers with API key and empty body (should handle gracefully)"
    success, response, status_code = make_api_request(
        "POST", "/api/passengers", HEADERS, {}
    )
    if success and status_code < 500:  # Any error code below 500 is acceptable
        try:
            result = response.json()
            if not result.get("success"):
                print_test_result(test_name, True, f"Correctly handled error (status: {status_code})")
                test_results.append(True)
            else:
                print_test_result(test_name, False, f"Unexpected success with empty data")
                test_results.append(False)
        except:
            print_test_result(test_name, False, f"JSON parsing failed")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Got {status_code} - logging may be causing 500 errors")
        test_results.append(False)
    
    # Test 7: POST /api/payments/initiate with API key and empty body
    test_name = "POST /api/payments/initiate with API key (should return 404 for missing booking)"
    success, response, status_code = make_api_request(
        "POST", "/api/payments/initiate", HEADERS, {}
    )
    if success and status_code in [400, 404]:  # Expected error for missing booking
        try:
            result = response.json()
            if not result.get("success"):
                print_test_result(test_name, True, f"Correctly returned {status_code} for invalid payment")
                test_results.append(True)
            else:
                print_test_result(test_name, False, f"Should return success=false")
                test_results.append(False)
        except:
            print_test_result(test_name, False, f"JSON parsing failed")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 400/404, got {status_code}")
        test_results.append(False)
    
    return test_results

def test_admin_logs_filters(admin_cookies: Dict[str, str]):
    """Test 4: Test filters on admin logs API (if table exists)"""
    print("\n" + "="*60)
    print("TESTING ADMIN LOGS FILTERS")
    print("="*60)
    
    test_results = []
    
    # First, make some API calls to generate logs
    print("🔄 Generating some API logs...")
    make_api_request("GET", "/api/flights/search?origin=NYC", HEADERS)
    make_api_request("GET", "/api/bookings/FAKE123", HEADERS)  # Should generate 404
    make_api_request("POST", "/api/bookings", data={})  # Should generate 401
    time.sleep(1)  # Brief pause to ensure logs are written
    
    # Test method filter
    test_name = "Admin logs API with method=GET filter"
    success, response, status_code = make_api_request(
        "GET", "/api/admin/logs?method=GET", cookies=admin_cookies
    )
    if success and status_code == 200:
        try:
            result = response.json()
            if result.get("success") and "data" in result:
                logs = result["data"]
                all_get = all(log.get("method") == "GET" for log in logs) if logs else True
                if all_get:
                    print_test_result(test_name, True, f"Method filter working: {len(logs)} GET requests")
                    test_results.append(True)
                else:
                    print_test_result(test_name, False, "Method filter not working correctly")
                    test_results.append(False)
            else:
                print_test_result(test_name, False, f"Invalid response structure: {result}")
                test_results.append(False)
        except Exception as e:
            print_test_result(test_name, False, f"JSON parsing failed: {e}")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 200, got {status_code}")
        test_results.append(False)
    
    # Test status filter
    test_name = "Admin logs API with status=4xx filter"
    success, response, status_code = make_api_request(
        "GET", "/api/admin/logs?status=4xx", cookies=admin_cookies
    )
    if success and status_code == 200:
        try:
            result = response.json()
            if result.get("success") and "data" in result:
                logs = result["data"]
                all_4xx = all(400 <= log.get("response_status", 0) < 500 for log in logs) if logs else True
                if all_4xx:
                    print_test_result(test_name, True, f"Status filter working: {len(logs)} 4xx responses")
                    test_results.append(True)
                else:
                    print_test_result(test_name, False, "Status filter not working correctly")
                    test_results.append(False)
            else:
                print_test_result(test_name, False, f"Invalid response structure")
                test_results.append(False)
        except Exception as e:
            print_test_result(test_name, False, f"JSON parsing failed: {e}")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 200, got {status_code}")
        test_results.append(False)
    
    # Test path filter
    test_name = "Admin logs API with path=/api/bookings filter"
    success, response, status_code = make_api_request(
        "GET", "/api/admin/logs?path=/api/bookings", cookies=admin_cookies
    )
    if success and status_code == 200:
        try:
            result = response.json()
            if result.get("success") and "data" in result:
                logs = result["data"]
                all_bookings = all("/api/bookings" in log.get("path", "") for log in logs) if logs else True
                if all_bookings:
                    print_test_result(test_name, True, f"Path filter working: {len(logs)} booking requests")
                    test_results.append(True)
                else:
                    print_test_result(test_name, False, "Path filter not working correctly")
                    test_results.append(False)
            else:
                print_test_result(test_name, False, f"Invalid response structure")
                test_results.append(False)
        except Exception as e:
            print_test_result(test_name, False, f"JSON parsing failed: {e}")
            test_results.append(False)
    else:
        print_test_result(test_name, False, f"Expected 200, got {status_code}")
        test_results.append(False)
    
    return test_results

def main():
    """Main test runner for API Request Logs feature"""
    print("=" * 80)
    print("🧪 BIPAIR API REQUEST LOGS FEATURE TEST")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Key: {API_KEY}")
    
    all_test_results = []
    
    # Test 1: Admin logs endpoint without auth
    print("\n" + "="*60)
    print("TEST 1: ADMIN LOGS API AUTHENTICATION")
    print("="*60)
    all_test_results.append(test_admin_logs_no_auth())
    
    # Test 2: Get admin session and test with auth
    admin_cookies = get_admin_session()
    if not admin_cookies:
        print("\n❌ CRITICAL: Cannot get admin session - remaining tests skipped")
        return False
    
    table_status = None
    auth_result, table_status = test_admin_logs_with_auth(admin_cookies)
    all_test_results.append(auth_result)
    
    # Test 3: Ensure chatbot APIs are not broken by logging
    print("\n" + "="*60)
    print("TEST 2: CHATBOT APIS FUNCTIONALITY")
    print("="*60)
    chatbot_results = test_chatbot_apis_not_broken()
    all_test_results.extend(chatbot_results)
    
    # Test 4: Test filters (only if table exists)
    if table_status == "table_exists":
        print("\n" + "="*60)
        print("TEST 3: ADMIN LOGS FILTERS")
        print("="*60)
        filter_results = test_admin_logs_filters(admin_cookies)
        all_test_results.extend(filter_results)
    else:
        print("\n⚠️  SKIPPING FILTER TESTS: api_logs table does not exist")
        print("   This is expected behavior - logging should work in fire-and-forget mode")
    
    # Summary
    passed_tests = sum(all_test_results)
    total_tests = len(all_test_results)
    
    print("\n" + "="*80)
    print("🎯 FINAL TEST SUMMARY - API REQUEST LOGS FEATURE")
    print("="*80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
    
    # Key success criteria analysis
    print("\n📋 KEY SUCCESS CRITERIA:")
    print("1. Chatbot APIs are NOT broken by logging - ", end="")
    chatbot_success_rate = sum(chatbot_results) / len(chatbot_results) * 100 if chatbot_results else 0
    print(f"✅ {chatbot_success_rate:.0f}% working" if chatbot_success_rate >= 85 else f"❌ {chatbot_success_rate:.0f}% working")
    
    print("2. Admin logs endpoint requires authentication - ", end="")
    auth_working = all_test_results[0] and all_test_results[1] if len(all_test_results) >= 2 else False
    print("✅ Working" if auth_working else "❌ Failed")
    
    if table_status == "table_missing":
        print("3. Missing table handled gracefully - ✅ Working (setupRequired: true)")
    elif table_status == "table_exists":
        print("3. Table exists and logs are returned - ✅ Working")
    
    if passed_tests == total_tests:
        print("\n✅ ALL TESTS PASSED - API Request Logs feature working correctly!")
        print("🎯 KEY ACHIEVEMENT: Chatbot APIs continue to work despite logging implementation")
    else:
        failed_count = total_tests - passed_tests
        print(f"\n❌ {failed_count} TEST(S) FAILED - Issues need attention")
        if chatbot_success_rate < 85:
            print("🚨 CRITICAL: Logging feature is breaking chatbot functionality!")
    
    print("\n" + "="*80)
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)