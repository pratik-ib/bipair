# BipAir API Documentation

> **Version:** 1.1  
> **Base URL:** `https://bipair.vercel.app`  
> **Last Updated:** June 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Chatbot APIs](#chatbot-apis)
   - [Flight Search](#1-flight-search)
   - [Flight Details](#2-flight-details)
   - [Create Booking](#3-create-booking)
   - [Get Booking](#4-get-booking)
   - [Update Booking](#5-update-booking)
   - [Cancel Booking](#6-cancel-booking)
   - [Create/Get Passenger](#7-createget-passenger)
   - [Get Passenger Profile](#8-get-passenger-profile)
   - [Check-in Status](#9-check-in-status)
   - [Complete Check-in](#10-complete-check-in)
   - [Initiate Payment](#11-initiate-payment)
   - [Process Payment](#12-process-payment)
   - [Get Payment Status](#13-get-payment-status)
   - [Send Notification](#14-send-notification)
4. [Media Generation APIs](#media-generation-apis)
   - [Seat Map Image](#15-seat-map-image)
   - [Check-in Seat Map](#16-check-in-seat-map)
   - [E-Ticket PDF](#17-e-ticket-pdf)
   - [Boarding Pass PDF](#18-boarding-pass-pdf)
5. [Webhooks](#webhooks)
6. [Admin APIs](#admin-apis)
   - [Admin Login](#admin-login)
   - [Admin Endpoints Reference](#admin-endpoints)
   - [API Request Logs](#api-request-logs)
7. [Error Handling](#error-handling)
8. [Data Types](#data-types)
9. [Complete Flow Example](#complete-flow-example)

---

## Overview

BipAir is a mock airline management system providing REST APIs for WhatsApp chatbot integration. The system supports:

- ✈️ Flight search and booking
- 👤 Passenger management
- 💳 Payment processing (mock)
- ✅ Online check-in
- 🎫 E-ticket and boarding pass generation
- 🖼️ Dynamic seat map images

### Response Format

All API responses follow this structure:

```json
{
  "success": true,
  "data": { ... }
}
```

Or on error:

```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Authentication

### API Key Authentication (Chatbot APIs)

All chatbot-facing APIs require the `x-api-key` header:

```
x-api-key: bipair-demo-key-2026
```

### Admin Authentication

Admin APIs use cookie-based session authentication via `iron-session`. First call the login endpoint, then include cookies in subsequent requests.

---

## Chatbot APIs

### 1. Flight Search

Search for available flights by origin, destination, and date.

**Endpoint:** `GET /api/flights/search`

**Headers:**
```
x-api-key: bipair-demo-key-2026
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| origin | string | No | Airport code (e.g., "DAR", "LHR") |
| destination | string | No | Airport code |
| date | string | No | Date in YYYY-MM-DD format |

**Example Request:**
```bash
curl -X GET "https://bipair.vercel.app/api/flights/search?origin=DAR&destination=LHR&date=2025-06-15" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "flightNumber": "BP101",
      "origin": "DAR",
      "originCity": "Dar es Salaam",
      "destination": "LHR",
      "destinationCity": "London",
      "departureTime": "2025-06-15T08:00:00Z",
      "arrivalTime": "2025-06-15T16:30:00Z",
      "durationMinutes": 510,
      "status": "scheduled",
      "gate": "A12",
      "terminal": "T1",
      "availableSeats": {
        "economy": 120,
        "business": 24,
        "firstClass": 8
      },
      "prices": {
        "economy": 450,
        "business": 1200,
        "firstClass": 2500
      }
    }
  ]
}
```

---

### 2. Flight Details

Get detailed information about a specific flight.

**Endpoint:** `GET /api/flights/{id}`

**Headers:**
```
x-api-key: bipair-demo-key-2026
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Flight ID |

**Example Request:**
```bash
curl -X GET "https://bipair.vercel.app/api/flights/123e4567-e89b-12d3-a456-426614174000" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "flight_number": "BP101",
    "origin": "DAR",
    "origin_city": "Dar es Salaam",
    "destination": "LHR",
    "destination_city": "London",
    "departure_time": "2025-06-15T08:00:00Z",
    "arrival_time": "2025-06-15T16:30:00Z",
    "aircraft_type": "Boeing 787",
    "status": "scheduled",
    "gate": "A12",
    "terminal": "T1",
    "economy_seats": 150,
    "business_seats": 30,
    "first_class_seats": 12,
    "economy_price": 450,
    "business_price": 1200,
    "first_class_price": 2500,
    "durationMinutes": 510,
    "availableSeats": {
      "economy": 120,
      "business": 24,
      "firstClass": 8
    }
  }
}
```

---

### 3. Create Booking

Create a new booking for a passenger on a flight.

**Endpoint:** `POST /api/bookings`

**Headers:**
```
x-api-key: bipair-demo-key-2026
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| passengerPhone | string | Yes | Phone number (unique identifier) |
| firstName | string | Yes* | First name (*required if new passenger) |
| lastName | string | Yes* | Last name |
| email | string | No | Email address |
| passportNumber | string | No | Passport number |
| nationality | string | No | Nationality |
| dateOfBirth | string | No | Date of birth (YYYY-MM-DD) |
| flightId | uuid | Yes | Flight ID |
| fareClass | string | Yes | "economy", "business", or "first_class" |
| seatNumber | string | No | Seat number (e.g., "12A") |
| specialRequests | string | No | Special requests |
| webhookUrl | string | No | URL to receive payment success webhook notification |

**Example Request:**
```bash
curl -X POST "https://bipair.vercel.app/api/bookings" \
  -H "x-api-key: bipair-demo-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerPhone": "+255712345678",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@email.com",
    "passportNumber": "AB1234567",
    "nationality": "Tanzanian",
    "dateOfBirth": "1990-05-15",
    "flightId": "123e4567-e89b-12d3-a456-426614174000",
    "fareClass": "economy",
    "seatNumber": "12A",
    "specialRequests": "Vegetarian meal",
    "webhookUrl": "https://your-server.com/webhooks/bipair"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "pnr": "BP7X2K",
    "bookingId": "booking-uuid-here",
    "paymentId": "payment-uuid-here",
    "amount": 450,
    "currency": "USD",
    "checkoutUrl": "https://bipair.vercel.app/checkout/payment-uuid-here",
    "ticketUrl": "https://bipair.vercel.app/api/ticket/BP7X2K",
    "checkInUrl": "https://bipair.vercel.app/checkin/BP7X2K",
    "boardingPassUrl": "https://bipair.vercel.app/api/boarding-pass/BP7X2K",
    "passenger": {
      "id": "passenger-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "loyaltyPoints": 100
    }
  }
}
```

---

### 4. Get Booking

Retrieve booking details by PNR.

**Endpoint:** `GET /api/bookings/{pnr}`

**Headers:**
```
x-api-key: bipair-demo-key-2026
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| pnr | string | 6-character booking reference |

**Example Request:**
```bash
curl -X GET "https://bipair.vercel.app/api/bookings/BP7X2K" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "pnr": "BP7X2K",
    "passenger_id": "passenger-uuid",
    "flight_id": "flight-uuid",
    "seat_number": "12A",
    "fare_class": "economy",
    "status": "confirmed",
    "payment_status": "paid",
    "total_amount": 450,
    "booking_source": "whatsapp",
    "special_requests": "Vegetarian meal",
    "created_at": "2025-06-10T14:30:00Z",
    "passenger": {
      "id": "passenger-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@email.com",
      "phone": "+255712345678",
      "passport_number": "AB1234567",
      "loyalty_points": 100
    },
    "flight": {
      "id": "flight-uuid",
      "flight_number": "BP101",
      "origin": "DAR",
      "destination": "LHR",
      "departure_time": "2025-06-15T08:00:00Z",
      "arrival_time": "2025-06-15T16:30:00Z",
      "gate": "A12",
      "terminal": "T1"
    },
    "payment": {
      "id": "payment-uuid",
      "amount": 450,
      "currency": "USD",
      "status": "success"
    }
  }
}
```

---

### 5. Update Booking

Update booking details (status, seat, special requests).

**Endpoint:** `PATCH /api/bookings/{pnr}`

**Headers:**
```
x-api-key: bipair-demo-key-2026
Content-Type: application/json
```

**Request Body (all optional — accepts both camelCase and snake_case):**

| Field | camelCase | snake_case | Type | Description |
|-------|-----------|------------|------|-------------|
| status | `status` | `status` | string | "pending", "confirmed", "checked_in", "cancelled" |
| Seat number | `seatNumber` | `seat_number` | string | New seat number |
| Special requests | `specialRequests` | `special_requests` | string | Updated requests |
| Payment status | `paymentStatus` | `payment_status` | string | "pending", "paid", "failed", "refunded" |

> 💡 **Note:** Both camelCase and snake_case field names are accepted interchangeably.

> ⚠️ Sending a body with none of the above fields returns `400 Bad Request`.

**Example Request (camelCase):**
```bash
curl -X PATCH "https://bipair.vercel.app/api/bookings/BP7X2K" \
  -H "x-api-key: bipair-demo-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "specialRequests": "Vegetarian meal please",
    "seatNumber": "14B"
  }'
```

**Example Request (snake_case — also valid):**
```bash
curl -X PATCH "https://bipair.vercel.app/api/bookings/BP7X2K" \
  -H "x-api-key: bipair-demo-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "special_requests": "Vegetarian meal please",
    "seat_number": "14B"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid",
    "pnr": "BP7X2K",
    "seat_number": "14B",
    "special_requests": "Vegetarian meal please",
    "status": "confirmed",
    "payment_status": "paid"
  }
}
```

**Error (no valid fields in body):**
```json
{
  "success": false,
  "error": "No valid fields to update. Allowed fields: status, seat_number, special_requests, payment_status"
}
```

---

### 6. Cancel Booking

Cancel a booking and process refund if paid.

**Endpoint:** `DELETE /api/bookings/{pnr}`

**Headers:**
```
x-api-key: bipair-demo-key-2026
```

**Example Request:**
```bash
curl -X DELETE "https://bipair.vercel.app/api/bookings/BP7X2K" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "refunded": true
  }
}
```

---

### 7. Create/Get Passenger

Create a new passenger or get existing by phone number.

**Endpoint:** `POST /api/passengers`

**Headers:**
```
x-api-key: bipair-demo-key-2026
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone | string | Yes | Phone number (unique) |
| firstName | string | Yes* | First name (*if creating new) |
| lastName | string | Yes* | Last name |
| email | string | No | Email address |
| passportNumber | string | No | Passport number |
| nationality | string | No | Nationality |
| dateOfBirth | string | No | Date of birth |

**Example Request:**
```bash
curl -X POST "https://bipair.vercel.app/api/passengers" \
  -H "x-api-key: bipair-demo-key-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+255712345678",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@email.com"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "passenger": {
      "id": "passenger-uuid",
      "phone": "+255712345678",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@email.com",
      "loyalty_points": 0
    },
    "isNew": true
  }
}
```

---

### 8. Get Passenger Profile

Get passenger details and booking history by phone.

**Endpoint:** `GET /api/passengers/{phone}`

**Headers:**
```
x-api-key: bipair-demo-key-2026
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| phone | string | URL-encoded phone number |

**Example Request:**
```bash
curl -X GET "https://bipair.vercel.app/api/passengers/%2B255712345678" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "passenger": {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+255712345678",
      "email": "john@email.com",
      "loyalty_points": 350
    },
    "bookings": [
      {
        "id": "booking-uuid",
        "pnr": "BP7X2K",
        "status": "confirmed",
        "flight": {
          "flight_number": "BP101",
          "origin": "DAR",
          "destination": "LHR"
        }
      }
    ]
  }
}
```

---

### 9. Check-in Status

Get check-in eligibility and current status.

**Endpoint:** `GET /api/checkin/{pnr}`

**Headers:**
```
x-api-key: bipair-demo-key-2026
```

**Example Request:**
```bash
curl -X GET "https://bipair.vercel.app/api/checkin/BP7X2K" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "canCheckin": true,
    "reason": null,
    "currentSeat": "12A",
    "checkinStatus": "confirmed",
    "seatMapImageUrl": "https://bipair.vercel.app/api/checkin/BP7X2K/seat-map-image",
    "flight": {
      "flightNumber": "BP101",
      "origin": "DAR",
      "destination": "LHR",
      "departureTime": "2025-06-15T08:00:00Z",
      "gate": "A12",
      "terminal": "T1"
    }
  }
}
```

**Possible `reason` values when `canCheckin` is false:**
- `"Already checked in"`
- `"Booking is cancelled"`
- `"Payment not completed"`

---

### 10. Complete Check-in

Complete check-in with seat selection.

**Endpoint:** `POST /api/checkin/{pnr}`

**Headers:**
```
x-api-key: bipair-demo-key-2026
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| seatNumber | string | Yes | Selected seat (e.g., "14A") |

**Example Request:**
```bash
curl -X POST "https://bipair.vercel.app/api/checkin/BP7X2K" \
  -H "x-api-key: bipair-demo-key-2026" \
  -H "Content-Type: application/json" \
  -d '{"seatNumber": "14A"}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "Check-in successful",
    "seatNumber": "14A",
    "boardingPassUrl": "https://bipair.vercel.app/api/boarding-pass/BP7X2K",
    "confirmationPageUrl": "https://bipair.vercel.app/checkin/BP7X2K",
    "seatMapImageUrl": "https://bipair.vercel.app/api/checkin/BP7X2K/seat-map-image"
  }
}
```

**Error Response (seat occupied):**
```json
{
  "success": false,
  "error": "Seat already occupied"
}
```

---

### 11. Initiate Payment

Get or create payment for a booking.

**Endpoint:** `POST /api/payments/initiate`

**Headers:**
```
x-api-key: bipair-demo-key-2026
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| pnr | string | Yes | Booking reference |

**Example Request:**
```bash
curl -X POST "https://bipair.vercel.app/api/payments/initiate" \
  -H "x-api-key: bipair-demo-key-2026" \
  -H "Content-Type: application/json" \
  -d '{"pnr": "BP7X2K"}'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "payment-uuid",
    "amount": 450,
    "currency": "USD",
    "checkoutUrl": "https://bipair.vercel.app/checkout/payment-uuid",
    "bookingStatus": "pending",
    "paymentStatus": "pending"
  }
}
```

---

### 12. Process Payment

Process the payment (mock - 90% success rate by default).

**Endpoint:** `POST /api/payments/{id}/process`

**Headers:**
```
Content-Type: application/json
```

> ⚠️ **Note:** This endpoint does NOT require API key (called from checkout page)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cardLastFour | string | Yes | Last 4 digits of card |
| cardholderName | string | Yes | Name on card |
| forceSuccess | boolean | No | Set to `true` to always succeed (useful for testing) |

**Example Request:**
```bash
curl -X POST "https://bipair.vercel.app/api/payments/payment-uuid/process" \
  -H "Content-Type: application/json" \
  -d '{
    "cardLastFour": "4242",
    "cardholderName": "John Doe",
    "forceSuccess": true
  }'
```

**Success Response (90% probability, or 100% if forceSuccess=true):**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "transactionRef": "TXN-ABC123XYZ"
  }
}
```

**Failure Response (10% probability):**
```json
{
  "success": false,
  "data": {
    "status": "failed",
    "transactionRef": null
  }
}
```

---

### 13. Get Payment Status

Check payment status.

**Endpoint:** `GET /api/payments/{id}`

> ⚠️ **Note:** This endpoint does NOT require API key

**Example Request:**
```bash
curl -X GET "https://bipair.vercel.app/api/payments/payment-uuid"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "status": "success",
    "amount": 450,
    "currency": "USD",
    "transactionRef": "TXN-ABC123XYZ",
    "createdAt": "2025-06-10T14:30:00Z"
  }
}
```

---

### 14. Send Notification

Log a notification to the system.

**Endpoint:** `POST /api/notifications/send`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| passengerId | uuid | Yes | Passenger ID |
| message | string | Yes | Notification message |
| bookingId | uuid | No | Related booking ID |

**Example Request:**
```bash
curl -X POST "https://bipair.vercel.app/api/notifications/send" \
  -H "Content-Type: application/json" \
  -d '{
    "passengerId": "passenger-uuid",
    "message": "Your flight BP101 is now boarding at Gate A12",
    "bookingId": "booking-uuid"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notification-uuid"
  }
}
```

---

## Media Generation APIs

### 15. Seat Map Image

Generate a seat map image for a flight with fare class filtering.

**Endpoint:** `GET /api/flights/{id}/seat-map-image`

**Headers:**
```
x-api-key: bipair-demo-key-2026
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| fareClass | string | Filter by fare class. Accepts: `economy`/`econ`/`e`, `business`/`biz`/`b`, `first_class`/`first`/`firstclass`/`f` |
| highlight | string | Seat to highlight (e.g., "12A") |
| format | string | "url" to get Supabase URL, omit for PNG stream |

**Seat Map Features:**
- ✅ Shows seat numbers on each seat (e.g., "5A")
- ✅ Occupied seats shown with X mark and grayed out
- ✅ When `fareClass` is provided, only that class seats are selectable (others dimmed)
- ✅ Different colors: Purple (First), Blue (Business), Green (Economy), Cyan (Extra Legroom)
- ✅ Dynamic layout based on flight's actual seat configuration
- ✅ Shows available seat count for the selected class
- ✅ Compact width (420px) optimized for WhatsApp

**Example Request (Economy class seats only):**
```bash
curl -X GET "https://bipair.vercel.app/api/flights/flight-uuid/seat-map-image?fareClass=economy&format=url" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Example Request (First class - multiple aliases work):**
```bash
# All these are equivalent:
?fareClass=first_class
?fareClass=first
?fareClass=f
```

**Example Request (All seats, PNG stream):**
```bash
curl -X GET "https://bipair.vercel.app/api/flights/flight-uuid/seat-map-image?highlight=12A" \
  -H "x-api-key: bipair-demo-key-2026" \
  --output seat-map.png
```

**Response:** PNG image stream

**Example Request (URL):**
```bash
curl -X GET "https://bipair.vercel.app/api/flights/flight-uuid/seat-map-image?format=url&fareClass=business" \
  -H "x-api-key: bipair-demo-key-2026"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imageUrl": "https://supabase-storage-url/seat-maps/flight-xxx.png"
  }
}
```

---

### 16. Check-in Seat Map

Generate seat map for check-in. **Automatically uses the booking's fare class** to show only selectable seats.

**Endpoint:** `GET /api/checkin/{pnr}/seat-map-image`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| highlight | string | Override highlight seat (default: booking's current seat) |
| format | string | "url" for Supabase URL |

> 💡 **Note:** The check-in seat map automatically filters seats based on the passenger's booked fare class. Economy passengers can only select economy seats, business passengers can only select business seats, etc.

**Example:**
```bash
curl -X GET "https://bipair.vercel.app/api/checkin/BP7X2K/seat-map-image?format=url" \
  -H "x-api-key: bipair-demo-key-2026"
```

---

### 17. E-Ticket PDF

Download e-ticket PDF for a booking.

**Endpoint:** `GET /api/ticket/{pnr}`

> ⚠️ **Note:** No API key required

**Example:**
```bash
curl -X GET "https://bipair.vercel.app/api/ticket/BP7X2K" \
  --output ticket-BP7X2K.pdf
```

**Response:** PDF file download

---

### 18. Boarding Pass PDF

Download boarding pass PDF (requires checked-in status).

**Endpoint:** `GET /api/boarding-pass/{pnr}`

> ⚠️ **Note:** No API key required

**Example:**
```bash
curl -X GET "https://bipair.vercel.app/api/boarding-pass/BP7X2K" \
  --output boarding-pass-BP7X2K.pdf
```

**Response:** PDF file download

**Error (not checked in):**
```json
{
  "success": false,
  "error": "Passenger has not completed check-in"
}
```

---

## Webhooks

BipAir supports webhook notifications to automatically notify your system when payment events occur.

### Setting Up Webhooks

When creating a booking, include the `webhookUrl` field in your request:

```json
{
  "passengerPhone": "+255712345678",
  "firstName": "John",
  "lastName": "Doe",
  "flightId": "flight-uuid",
  "fareClass": "economy",
  "webhookUrl": "https://your-server.com/webhooks/bipair"
}
```

### Payment Success Webhook

When a payment is successfully processed, BipAir will send a POST request to your webhook URL with the following payload:

```json
{
  "event": "payment.success",
  "pnr": "BP7X2K",
  "paymentId": "payment-uuid",
  "amount": 450,
  "currency": "USD",
  "transactionRef": "TXN1234567890ABCD",
  "ticketUrl": "https://bipair.vercel.app/api/ticket/BP7X2K",
  "checkInUrl": "https://bipair.vercel.app/checkin/BP7X2K",
  "boardingPassUrl": "https://bipair.vercel.app/api/boarding-pass/BP7X2K",
  "passenger": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+255712345678",
    "email": "john.doe@email.com",
    "loyaltyPoints": 100
  },
  "flight": {
    "flightNumber": "BP101",
    "origin": "DAR",
    "originCity": "Dar es Salaam",
    "destination": "LHR",
    "destinationCity": "London",
    "departureTime": "2025-06-15T08:00:00Z",
    "arrivalTime": "2025-06-15T16:30:00Z",
    "gate": "A12",
    "terminal": "T1",
    "status": "scheduled"
  },
  "booking": {
    "seatNumber": "12A",
    "fareClass": "economy",
    "bookingSource": "whatsapp",
    "createdAt": "2025-06-10T14:30:00Z"
  }
}
```

### Webhook Behavior

- **Non-blocking**: Webhook delivery is asynchronous and does not affect the payment response
- **Retry**: No automatic retry on failure (webhook fires once)
- **Timeout**: Standard HTTP timeout applies
- **Content-Type**: `application/json`

### Using Webhook Data

The webhook payload includes everything you need to:
1. **Send e-ticket**: Use `ticketUrl` to download/forward the PDF ticket
2. **Enable check-in**: Share `checkInUrl` with the passenger
3. **Send boarding pass**: After check-in, use `boardingPassUrl`
4. **Personalize messages**: Use passenger and flight details

### Example Webhook Handler (Node.js)

```javascript
app.post('/webhooks/bipair', async (req, res) => {
  const { event, pnr, ticketUrl, passenger, flight } = req.body;
  
  if (event === 'payment.success') {
    // Send confirmation message via WhatsApp
    await sendWhatsAppMessage(passenger.phone, {
      text: `✅ Payment confirmed for flight ${flight.flightNumber}!`,
      document: ticketUrl, // Attach e-ticket PDF
    });
  }
  
  res.status(200).send('OK');
});
```

---

## Admin APIs

These APIs are for the admin panel and require session-based authentication.

### Admin Login

**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST "https://bipair.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Infobip@123"}'
```

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/stats | Dashboard statistics |
| GET | /api/admin/flights | List flights (paginated) |
| POST | /api/admin/flights | Create flight |
| PATCH | /api/admin/flights/{id} | Update flight |
| DELETE | /api/admin/flights/{id} | Delete flight |
| GET | /api/admin/bookings | List bookings (paginated) |
| GET | /api/admin/passengers | List passengers |
| GET | /api/admin/passengers/{id} | Passenger details |
| PATCH | /api/admin/passengers/{id} | Update passenger |
| GET | /api/admin/payments | List payments |
| POST | /api/admin/payments/{id}/refund | Process refund |
| GET | /api/admin/notifications | List notifications |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (invalid/missing API key) |
| 404 | Not Found (resource doesn't exist) |
| 409 | Conflict (e.g., seat already occupied) |
| 500 | Server Error |

### Common Error Responses

**Unauthorized:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Not Found:**
```json
{
  "success": false,
  "error": "Booking not found"
}
```

**Validation Error:**
```json
{
  "success": false,
  "error": "Flight not found"
}
```

---

## Data Types

### Fare Classes
- `economy`
- `business`
- `first_class`

### Booking Status
- `pending` - Initial state
- `confirmed` - Payment completed
- `checked_in` - Check-in completed
- `cancelled` - Booking cancelled

### Payment Status
- `pending` - Awaiting payment
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

### Flight Status
- `scheduled`
- `boarding`
- `departed`
- `arrived`
- `delayed`
- `cancelled`

---

## Complete Flow Example

Here's a typical booking flow:

### 1. Search Flights
```bash
GET /api/flights/search?origin=DAR&destination=LHR&date=2025-06-15
```

### 2. Create Booking
```bash
POST /api/bookings
{
  "passengerPhone": "+255712345678",
  "firstName": "John",
  "lastName": "Doe",
  "flightId": "flight-uuid",
  "fareClass": "economy",
  "seatNumber": "12A"
}
# Returns: pnr, paymentId, checkoutUrl
```

### 3. Redirect to Payment
```
User visits: checkoutUrl
```

### 4. Process Payment
```bash
POST /api/payments/{paymentId}/process
{
  "cardLastFour": "4242",
  "cardholderName": "John Doe"
}
```

### 5. Check Payment Status (optional)
```bash
GET /api/payments/{paymentId}
```

### 6. Get Check-in Status (before flight)
```bash
GET /api/checkin/{pnr}
```

### 7. Complete Check-in
```bash
POST /api/checkin/{pnr}
{
  "seatNumber": "14A"
}
# Returns: boardingPassUrl
```

### 8. Download Documents
```bash
GET /api/ticket/{pnr}        # E-Ticket PDF
GET /api/boarding-pass/{pnr} # Boarding Pass PDF
```

---

## Support

For API issues or questions, contact the development team.

**API Version:** 1.0  
**Last Updated:** June 2025
