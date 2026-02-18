-- BipAir Seed Data Migration
-- Run this AFTER 001_initial.sql

-- Seed Flights (20 flights, mix of routes, future dates within next 30 days)
INSERT INTO flights (flight_number, origin, origin_city, destination, destination_city, departure_time, arrival_time, aircraft_type, status, gate, terminal, economy_seats, business_seats, first_class_seats, economy_price, business_price, first_class_price) VALUES
  ('BP101', 'DAR', 'Dar es Salaam', 'LHR', 'London', NOW() + INTERVAL '1 day 8 hours', NOW() + INTERVAL '1 day 19 hours', 'Boeing 737', 'scheduled', 'B12', 'T2', 120, 20, 8, 350.00, 900.00, 2200.00),
  ('BP102', 'LHR', 'London', 'DAR', 'Dar es Salaam', NOW() + INTERVAL '2 days 10 hours', NOW() + INTERVAL '2 days 21 hours', 'Boeing 737', 'scheduled', 'A5', 'T1', 120, 20, 8, 320.00, 850.00, 2100.00),
  ('BP201', 'JNB', 'Johannesburg', 'DXB', 'Dubai', NOW() + INTERVAL '3 days 6 hours', NOW() + INTERVAL '3 days 15 hours', 'Boeing 737', 'scheduled', 'C3', 'T3', 120, 20, 8, 280.00, 750.00, 1800.00),
  ('BP202', 'DXB', 'Dubai', 'JNB', 'Johannesburg', NOW() + INTERVAL '4 days 14 hours', NOW() + INTERVAL '4 days 23 hours', 'Boeing 737', 'scheduled', 'D7', 'T2', 120, 20, 8, 290.00, 780.00, 1850.00),
  ('BP301', 'NBO', 'Nairobi', 'JNB', 'Johannesburg', NOW() + INTERVAL '5 days 7 hours', NOW() + INTERVAL '5 days 11 hours', 'Boeing 737', 'scheduled', 'E2', 'T1', 120, 20, 8, 180.00, 600.00, 1500.00),
  ('BP302', 'JNB', 'Johannesburg', 'NBO', 'Nairobi', NOW() + INTERVAL '6 days 9 hours', NOW() + INTERVAL '6 days 13 hours', 'Boeing 737', 'scheduled', 'F4', 'T2', 120, 20, 8, 190.00, 620.00, 1550.00),
  ('BP401', 'CPT', 'Cape Town', 'ZAG', 'Zagreb', NOW() + INTERVAL '7 days 11 hours', NOW() + INTERVAL '7 days 23 hours', 'Boeing 737', 'scheduled', 'G1', 'T3', 120, 20, 8, 420.00, 1100.00, 2800.00),
  ('BP402', 'ZAG', 'Zagreb', 'CPT', 'Cape Town', NOW() + INTERVAL '8 days 13 hours', NOW() + INTERVAL '9 days 1 hour', 'Boeing 737', 'scheduled', 'H3', 'T1', 120, 20, 8, 410.00, 1080.00, 2750.00),
  ('BP501', 'DAR', 'Dar es Salaam', 'JNB', 'Johannesburg', NOW() + INTERVAL '9 days 8 hours', NOW() + INTERVAL '9 days 12 hours', 'Boeing 737', 'scheduled', 'A2', 'T2', 120, 20, 8, 200.00, 650.00, 1600.00),
  ('BP502', 'JNB', 'Johannesburg', 'DAR', 'Dar es Salaam', NOW() + INTERVAL '10 days 10 hours', NOW() + INTERVAL '10 days 14 hours', 'Boeing 737', 'scheduled', 'B4', 'T1', 120, 20, 8, 210.00, 660.00, 1620.00),
  ('BP601', 'ZAG', 'Zagreb', 'DAR', 'Dar es Salaam', NOW() + INTERVAL '11 days 6 hours', NOW() + INTERVAL '11 days 18 hours', 'Boeing 737', 'scheduled', 'C6', 'T3', 120, 20, 8, 380.00, 950.00, 2400.00),
  ('BP602', 'DAR', 'Dar es Salaam', 'ZAG', 'Zagreb', NOW() + INTERVAL '12 days 9 hours', NOW() + INTERVAL '12 days 21 hours', 'Boeing 737', 'scheduled', 'D2', 'T2', 120, 20, 8, 370.00, 930.00, 2350.00),
  ('BP701', 'NBO', 'Nairobi', 'DAR', 'Dar es Salaam', NOW() + INTERVAL '13 days 7 hours', NOW() + INTERVAL '13 days 9 hours', 'Boeing 737', 'scheduled', 'E5', 'T1', 120, 20, 8, 150.00, 600.00, 1500.00),
  ('BP702', 'DAR', 'Dar es Salaam', 'NBO', 'Nairobi', NOW() + INTERVAL '14 days 11 hours', NOW() + INTERVAL '14 days 13 hours', 'Boeing 737', 'scheduled', 'F1', 'T2', 120, 20, 8, 160.00, 610.00, 1520.00),
  ('BP801', 'DAR', 'Dar es Salaam', 'DXB', 'Dubai', NOW() + INTERVAL '15 days 8 hours', NOW() + INTERVAL '15 days 17 hours', 'Boeing 737', 'scheduled', 'G3', 'T3', 120, 20, 8, 310.00, 820.00, 2000.00),
  ('BP802', 'DXB', 'Dubai', 'DAR', 'Dar es Salaam', NOW() + INTERVAL '16 days 12 hours', NOW() + INTERVAL '16 days 21 hours', 'Boeing 737', 'boarding', 'H1', 'T1', 120, 20, 8, 300.00, 800.00, 1950.00),
  ('BP901', 'ADD', 'Addis Ababa', 'JNB', 'Johannesburg', NOW() + INTERVAL '17 days 7 hours', NOW() + INTERVAL '17 days 13 hours', 'Boeing 737', 'scheduled', 'A7', 'T2', 120, 20, 8, 220.00, 680.00, 1700.00),
  ('BP902', 'JNB', 'Johannesburg', 'ADD', 'Addis Ababa', NOW() + INTERVAL '18 days 9 hours', NOW() + INTERVAL '18 days 15 hours', 'Boeing 737', 'delayed', 'B2', 'T3', 120, 20, 8, 230.00, 700.00, 1750.00),
  ('BP103', 'DAR', 'Dar es Salaam', 'LHR', 'London', NOW() + INTERVAL '20 days 8 hours', NOW() + INTERVAL '20 days 19 hours', 'Boeing 737', 'scheduled', 'C4', 'T1', 120, 20, 8, 360.00, 920.00, 2250.00),
  ('BP303', 'NBO', 'Nairobi', 'JNB', 'Johannesburg', NOW() + INTERVAL '25 days 6 hours', NOW() + INTERVAL '25 days 10 hours', 'Boeing 737', 'scheduled', 'D5', 'T2', 120, 20, 8, 195.00, 640.00, 1580.00);

-- Seed Passengers (5 passengers with African/Croatian phone numbers)
INSERT INTO passengers (id, first_name, last_name, email, phone, passport_number, nationality, date_of_birth, loyalty_points) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Amara', 'Okonkwo', 'amara.okonkwo@email.com', '+254712345678', 'TZ123456', 'Tanzanian', '1988-03-15', 750),
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'John', 'Mwangi', 'john.mwangi@email.com', '+254798765432', 'KE654321', 'Kenyan', '1992-07-22', 250),
  ('c3d4e5f6-a7b8-9012-cdef-012345678902', 'Lena', 'Horvat', 'lena.horvat@email.com', '+385912345678', 'HR789012', 'Croatian', '1985-11-10', 500),
  ('d4e5f6a7-b8c9-0123-defa-123456789013', 'Thabo', 'Nkosi', 'thabo.nkosi@email.com', '+27831234567', 'ZA345678', 'South African', '1995-04-30', 100),
  ('e5f6a7b8-c9d0-1234-efab-234567890124', 'Fatima', 'Hassan', 'fatima.hassan@email.com', '+255787654321', 'TZ987654', 'Tanzanian', '1990-09-05', 1200);

-- Get flight IDs for bookings
-- We'll use the first flight (BP101) for confirmed booking
-- Second flight (BP102) for pending
-- Third flight (BP201) for cancelled

-- Seed Bookings
INSERT INTO bookings (id, pnr, passenger_id, flight_id, seat_number, fare_class, status, payment_status, total_amount, booking_source, created_at)
SELECT
  'f6a7b8c9-d0e1-2345-fabc-345678901235',
  'BP1A2B',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  f.id,
  '14A',
  'economy',
  'confirmed',
  'paid',
  350.00,
  'whatsapp',
  NOW() - INTERVAL '2 days'
FROM flights f WHERE f.flight_number = 'BP101' LIMIT 1;

INSERT INTO bookings (id, pnr, passenger_id, flight_id, seat_number, fare_class, status, payment_status, total_amount, booking_source, created_at)
SELECT
  'a7b8c9d0-e1f2-3456-abcd-456789012346',
  'BP3C4D',
  'b2c3d4e5-f6a7-8901-bcde-f01234567891',
  f.id,
  '22B',
  'business',
  'pending',
  'pending',
  850.00,
  'web',
  NOW() - INTERVAL '1 day'
FROM flights f WHERE f.flight_number = 'BP102' LIMIT 1;

INSERT INTO bookings (id, pnr, passenger_id, flight_id, seat_number, fare_class, status, payment_status, total_amount, booking_source, created_at)
SELECT
  'b8c9d0e1-f2a3-4567-bcde-567890123457',
  'BP5E6F',
  'c3d4e5f6-a7b8-9012-cdef-012345678902',
  f.id,
  '5C',
  'first_class',
  'cancelled',
  'refunded',
  2800.00,
  'admin',
  NOW() - INTERVAL '3 days'
FROM flights f WHERE f.flight_number = 'BP201' LIMIT 1;

-- Seed Payments
INSERT INTO payments (id, booking_id, amount, currency, status, payment_method, card_last_four, transaction_ref, created_at) VALUES
  ('c9d0e1f2-a3b4-5678-cdef-678901234568', 'f6a7b8c9-d0e1-2345-fabc-345678901235', 350.00, 'USD', 'success', 'card', '4242', 'TXN1234567890ABCD', NOW() - INTERVAL '2 days'),
  ('d0e1f2a3-b4c5-6789-defa-789012345679', 'a7b8c9d0-e1f2-3456-abcd-456789012346', 850.00, 'USD', 'pending', 'card', NULL, NULL, NOW() - INTERVAL '1 day');

-- Update payment_id on bookings
UPDATE bookings SET payment_id = 'c9d0e1f2-a3b4-5678-cdef-678901234568' WHERE pnr = 'BP1A2B';
UPDATE bookings SET payment_id = 'd0e1f2a3-b4c5-6789-defa-789012345679' WHERE pnr = 'BP3C4D';

-- Create seat-maps storage bucket (run in Supabase dashboard or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('seat-maps', 'seat-maps', true);
