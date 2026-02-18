-- BipAir Initial Schema Migration
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- flights table
CREATE TABLE IF NOT EXISTS flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number TEXT NOT NULL,
  origin TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  destination TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  aircraft_type TEXT NOT NULL DEFAULT 'Boeing 737',
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','boarding','delayed','cancelled','departed','landed')),
  gate TEXT,
  terminal TEXT,
  economy_seats INTEGER NOT NULL DEFAULT 120,
  business_seats INTEGER NOT NULL DEFAULT 20,
  first_class_seats INTEGER NOT NULL DEFAULT 8,
  economy_price DECIMAL(10,2) NOT NULL,
  business_price DECIMAL(10,2) NOT NULL,
  first_class_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- passengers table
CREATE TABLE IF NOT EXISTS passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  passport_number TEXT,
  nationality TEXT,
  date_of_birth DATE,
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pnr TEXT UNIQUE NOT NULL,
  passenger_id UUID REFERENCES passengers(id),
  flight_id UUID REFERENCES flights(id),
  seat_number TEXT,
  fare_class TEXT NOT NULL
    CHECK (fare_class IN ('economy','business','first_class')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','checked_in')),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','refunded','failed')),
  payment_id UUID,
  total_amount DECIMAL(10,2),
  booking_source TEXT DEFAULT 'whatsapp'
    CHECK (booking_source IN ('whatsapp','web','admin')),
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed','refunded')),
  payment_method TEXT DEFAULT 'card',
  card_last_four TEXT,
  transaction_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES passengers(id),
  booking_id UUID REFERENCES bookings(id),
  channel TEXT DEFAULT 'whatsapp',
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent'
    CHECK (status IN ('sent','delivered','failed','pending')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for all tables (demo purposes)
ALTER TABLE flights DISABLE ROW LEVEL SECURITY;
ALTER TABLE passengers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
