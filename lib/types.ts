export interface Flight {
  id: string;
  flight_number: string;
  origin: string;
  origin_city: string;
  destination: string;
  destination_city: string;
  departure_time: string;
  arrival_time: string;
  aircraft_type: string;
  status: 'scheduled' | 'boarding' | 'delayed' | 'cancelled' | 'departed' | 'landed';
  gate?: string;
  terminal?: string;
  economy_seats: number;
  business_seats: number;
  first_class_seats: number;
  economy_price: number;
  business_price: number;
  first_class_price: number;
  created_at: string;
}

export interface Passenger {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  passport_number?: string;
  nationality?: string;
  date_of_birth?: string;
  loyalty_points: number;
  created_at: string;
}

export interface Booking {
  id: string;
  pnr: string;
  passenger_id: string;
  flight_id: string;
  seat_number?: string;
  fare_class: 'economy' | 'business' | 'first_class';
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked_in';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  payment_id?: string;
  total_amount?: number;
  booking_source: 'whatsapp' | 'web' | 'admin';
  special_requests?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  payment_method: string;
  card_last_four?: string;
  transaction_ref?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  passenger_id?: string;
  booking_id?: string;
  channel: string;
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  sent_at: string;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SeatInfo {
  seatNumber: string;
  row: number;
  column: string;
  fareClass: 'economy' | 'business' | 'first_class';
  isOccupied: boolean;
  isExtraLegroom: boolean;
}

export interface BookingWithDetails extends Booking {
  passenger?: Passenger;
  flight?: Flight;
  payment?: Payment;
}

export interface SessionData {
  isLoggedIn: boolean;
  username?: string;
}
