# GoHomey Server API

This document summarizes the available REST endpoints and notes a few implementation details.

Base URL: http://<host>:<port>

Default port: 5000

Authentication: JWT (Authorization: Bearer <token>) for protected endpoints.

## Health & diagnostics
- GET / — quick index responds with "API Running"
- GET /ping — JSON health check { ok, time, uptimeSec, version, node, env }
- HEAD /ping — lightweight health probe
- GET /_diag/echo — diagnostic echo of request metadata (protocol, forwarded headers, ip). No secrets exposed. Enable request logging with LOG_PING=true.

## Mount points
- /auth → authRoutes
- /auth → phoneAuthRoutes (OTP)
- /rides → rideRoutes
- /users → userRoutes
- /drivers → driverRoutes
- /user-details → userDetailRoutes
- /payments → paymentRoutes

Note: Both traditional auth and phone OTP are mounted under /auth.

## Auth
- POST /auth/register
- POST /auth/request-otp
- POST /auth/verify-otp

## Users
Protected with JWT; some require Admin role.
- GET /users/profile — current user's profile
- PUT /users/profile — update current user's profile
- POST /users — create user (Admin)
- GET /users — list users (Admin)
- GET /users/:id — get user by id (Admin)
- PUT /users/:id — update user (Admin or scoped by middleware)
- DELETE /users/:id — delete user (Admin)

## User Details
Protected with JWT.
- PUT /user-details/home-location — set home location
- GET /user-details/home-location — get home location
- PUT /user-details/current-location — update current location

## Rides
Protected with JWT except estimate and vehicle types.
- GET /rides/vehicle-types — list vehicle types
- POST /rides/estimate — route pricing estimate
- POST /rides — create a ride
- GET /rides/:id — get ride and details
- PUT /rides/:id — update ride (status, driverId, vehicleId)
- DELETE /rides/:id — delete ride and ride detail
- GET /rides/:id/track-driver — track assigned driver location
- GET /rides/:id/track-route — get planned route
- POST /rides/:id/accept — accept a ride (atomic claim)

Removed: POST /rides/find-drivers (deprecated; use /drivers/nearby)

## Drivers
All routes require JWT.
- POST /drivers — create driver (Admin)
- GET /drivers — list drivers (Admin)
- GET /drivers/:id — driver profile
- PUT /drivers/:id — update driver profile
- DELETE /drivers/:id — delete driver (Admin)
- POST /drivers/:id — ban driver (Admin)
- POST /drivers/unban/:id — unban driver (Admin)

Vehicles
- POST /drivers/:id/vehicle — add or update vehicle
- GET /drivers/:id/vehicles — list driver's vehicles

Rides
- GET /drivers/:id/rides — driver's ride history
- GET /drivers/:id/daily-summary — totals for today
- GET /drivers/:id/upcoming-requests — assigned rides not completed/cancelled
- GET /drivers/:id/available-requests — unassigned, nearby rides matching vehicle types

Location and Availability
- PUT /drivers/:id/status — update availability
- PUT /drivers/:id/location — update driver location

Matching
- POST /drivers/nearby — find nearby active drivers with a given vehicle type
  - Body: { lat, lng, vehicleTypeId }

## Notes and cleanup
- User model no longer defines a location field; removed erroneous 2dsphere index on user.location.
- GeoJSON storage:
  - RideDetail.pickup and dropoff are GeoJSON with 2dsphere indices.
  - UserDetail.currentLocation now has a 2dsphere index for future geo queries.
- rideController.trackDriver now reads UserDetail.currentLocation.
- Deprecated rideController.findNearbyDrivers and its /rides/find-drivers route were removed to avoid duplication; use /drivers/nearby instead.

## Environment
- MONGO_URI must be set to enable MongoDB connection.
- CORS is enabled for all origins.
 - LOG_PING=true to log ping/diag requests to console
 - The server sets `trust proxy` to correctly detect HTTPS behind proxies (e.g., Render)
1. Map Comp:
 
## Payments

VNPay integration exists for compatibility, but the default flow uses VietQR (bank transfer) or cash at drop-off.

Endpoints (JWT required unless noted):

- POST /payments/vietqr/create — create a pending transaction and return a static VietQR image URL
  - Body: { rideId: string }
  - Response: { transactionId, orderId, amount, currency, qrUrl, meta }
- GET /payments/transactions/:id — get transaction by id
- POST /payments/transactions/:id/paid-cash — mark transaction as paid by cash (Driver/Admin)
- POST /payments/transactions/:id/paid-transfer — mark transaction as paid by bank transfer (Driver/Admin)
- GET /payments/transactions/:orderId/status — get status by orderId

Environment variables for VietQR image rendering (required):

- VIETQR_BANK_BIN — Bank BIN code (e.g., 970415)
- VIETQR_ACCOUNT_NO — Destination account number
- VIETQR_ACCOUNT_NAME — Account holder name (for display)
- VIETQR_TEMPLATE — Optional: qr_only | compact | compact2 (default: qr_only)

Notes:
- VietQR is a static bank transfer QR. There is no IPN callback — driver confirms receipt and marks the transaction paid.
- When a transaction is marked Paid, the related ride is automatically set to Completed.
    - Display: react-native-maps + OSM
    - Routing: OpenRouteService API
    - GPS: expo-location