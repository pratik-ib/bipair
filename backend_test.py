#!/usr/bin/env python3
"""
Backend API Test Script for BipAir - PATCH Bookings Endpoint Focus
Tests the PATCH /api/bookings/[pnr] endpoint specifically as requested.
"""
import requests
import json
import sys
import os
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "https://bipair-chat.preview.emergentagent.com"
API_KEY = "bipair-demo-key-2026"
HEADERS = {"x-api-key": API_KEY}

def print_test_result(test_name: str, success: bool, details: str = ""):
    """Print formatted test result"""
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"\n{status}: {test_name}")
    if details:
        print(f"   {details}")

def make_api_request(method: str, endpoint: str, headers: Dict[str, str] = None, data: Dict[str, Any] = None) -> tuple:
    """Make API request and return (success, response, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    req_headers = headers or {}
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=req_headers)
        elif method.upper() == "POST":
            response = requests.post(url, headers=req_headers, json=data)
        elif method.upper() == "PATCH":
            response = requests.patch(url, headers=req_headers, json=data)
        else:
            return False, None, 0
            
        return True, response, response.status_code
    except Exception as e:
        return False, str(e), 0

def get_valid_pnr() -> Optional[str]:
    """Try to get a valid PNR from the database"""
    print("\n🔍 Attempting to get a valid PNR from database...")
    
    # Try to get bookings from admin endpoint (no auth needed per test_result.md)
    success, response, status_code = make_api_request("GET", "/api/admin/bookings")
    
    if success and status_code == 200:
        try:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("bookings"):
                bookings = data["data"]["bookings"]
                if bookings and len(bookings) > 0:
                    pnr = bookings[0].get("pnr")
                    print(f"   Found existing PNR: {pnr}")
                    return pnr
        except:
            pass
    
    print("   No existing bookings found in database")
    return None

def create_test_booking() -> Optional[str]:
    """Create a test booking and return PNR if successful"""
    print("\n🔧 Attempting to create a test booking...")
    
    # Create booking payload 
    booking_data = {
        "flight_id": "12345",
        "passenger": {
            "name": "John Smith",
            "email": "john.smith@example.com", 
            "phone": "+1234567890"
        },
        "seat_number": "12A",
        "special_requests": "Window seat please"
    }
    
    success, response, status_code = make_api_request(
        "POST", "/api/bookings", HEADERS, booking_data
    )
    
    if success and status_code in [200, 201]:
        try:
            data = response.json()
            if data.get("success") and data.get("data", {}).get("pnr"):
                pnr = data["data"]["pnr"]
                print(f"   Successfully created booking with PNR: {pnr}")
                return pnr
        except:
            pass
    
    print(f"   Failed to create booking (status: {status_code})")
    return None

def test_patch_with_camelcase(pnr: str):
    """Test PATCH with camelCase field (original failing case)"""
    test_name = "PATCH with camelCase (specialRequests)"
    data = {"specialRequests": "Vegetarian meal please"}
    
    success, response, status_code = make_api_request(
        "PATCH", f"/api/bookings/{pnr}", HEADERS, data
    )
    
    if success and status_code == 200:
        try:
            result = response.json()
            if result.get("success"):
                print_test_result(test_name, True, "camelCase input accepted successfully")
                return True
        except:
            pass
    
    error_msg = f"Status: {status_code}"
    if success:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False

def test_patch_with_snakecase(pnr: str):
    """Test PATCH with snake_case field"""
    test_name = "PATCH with snake_case (special_requests)"
    data = {"special_requests": "Window seat preferred"}
    
    success, response, status_code = make_api_request(
        "PATCH", f"/api/bookings/{pnr}", HEADERS, data
    )
    
    if success and status_code == 200:
        try:
            result = response.json()
            if result.get("success"):
                print_test_result(test_name, True, "snake_case input accepted successfully")
                return True
        except:
            pass
    
    error_msg = f"Status: {status_code}"
    if success:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False

def test_patch_with_empty_body(pnr: str):
    """Test PATCH with invalid/empty body (no valid fields)"""
    test_name = "PATCH with invalid body (no valid fields)"
    data = {"unknownField": "value"}
    
    success, response, status_code = make_api_request(
        "PATCH", f"/api/bookings/{pnr}", HEADERS, data
    )
    
    if success and status_code == 400:
        try:
            result = response.json()
            if not result.get("success") and "valid fields" in result.get("error", "").lower():
                print_test_result(test_name, True, "Correctly returned 400 for invalid fields")
                return True
        except:
            pass
    
    error_msg = f"Expected 400, got {status_code}"
    if success:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False

def test_patch_nonexistent_pnr():
    """Test PATCH with non-existent PNR"""
    test_name = "PATCH with non-existent PNR"
    fake_pnr = "FAKEPNR999"
    data = {"status": "confirmed"}
    
    success, response, status_code = make_api_request(
        "PATCH", f"/api/bookings/{fake_pnr}", HEADERS, data
    )
    
    if success and status_code == 404:
        try:
            result = response.json()
            if not result.get("success"):
                print_test_result(test_name, True, "Correctly returned 404 for non-existent PNR")
                return True
        except:
            pass
    
    error_msg = f"Expected 404, got {status_code}"
    if success:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False

def test_patch_status_update(pnr: str):
    """Test PATCH with status update (snake_case field)"""
    test_name = "PATCH with status update"
    data = {"status": "confirmed"}
    
    success, response, status_code = make_api_request(
        "PATCH", f"/api/bookings/{pnr}", HEADERS, data
    )
    
    if success and status_code == 200:
        try:
            result = response.json()
            if result.get("success"):
                print_test_result(test_name, True, "Status update successful")
                return True
        except:
            pass
    
    error_msg = f"Status: {status_code}"
    if success:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False

def test_patch_without_api_key(pnr: str):
    """Test PATCH without API key"""
    test_name = "PATCH without API key (should return 401)"
    data = {"status": "confirmed"}
    
    success, response, status_code = make_api_request(
        "PATCH", f"/api/bookings/{pnr}", {}, data
    )
    
    if success and status_code == 401:
        try:
            result = response.json()
            if not result.get("success"):
                print_test_result(test_name, True, "Correctly returned 401 for missing API key")
                return True
        except:
            pass
    
    error_msg = f"Expected 401, got {status_code}"
    if success:
        try:
            error_msg += f", Response: {response.json()}"
        except:
            error_msg += f", Response: {response.text[:100]}"
    
    print_test_result(test_name, False, error_msg)
    return False

def main():
    """Main test runner for PATCH /api/bookings/[pnr] endpoint"""
    print("=" * 80)
    print("🧪 BIPAIR BACKEND TEST - PATCH /api/bookings/[pnr] ENDPOINT")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Key: {API_KEY}")
    
    # Try to get a valid PNR
    valid_pnr = get_valid_pnr()
    if not valid_pnr:
        valid_pnr = create_test_booking()
    
    test_results = []
    
    # Test cases that don't need a valid PNR
    print("\n" + "="*50)
    print("Testing error cases (no valid PNR needed)")
    print("="*50)
    
    test_results.append(test_patch_nonexistent_pnr())
    
    if valid_pnr:
        test_results.append(test_patch_without_api_key(valid_pnr))
    
    # Test cases that need a valid PNR
    if valid_pnr:
        print("\n" + "="*50)
        print(f"Testing with valid PNR: {valid_pnr}")
        print("="*50)
        
        # Core tests requested in the review
        test_results.append(test_patch_with_camelcase(valid_pnr))
        test_results.append(test_patch_with_snakecase(valid_pnr))
        test_results.append(test_patch_with_empty_body(valid_pnr))
        test_results.append(test_patch_status_update(valid_pnr))
    else:
        print("\n⚠️  WARNING: Could not obtain valid PNR for comprehensive testing")
        print("   Only error case testing performed")
    
    # Summary
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print("\n" + "="*80)
    print("🎯 TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
    
    if passed_tests == total_tests:
        print("\n✅ ALL TESTS PASSED - PATCH endpoint working correctly!")
    else:
        print(f"\n❌ {total_tests - passed_tests} TEST(S) FAILED - Issues need attention")
    
    print("\n" + "="*80)
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)