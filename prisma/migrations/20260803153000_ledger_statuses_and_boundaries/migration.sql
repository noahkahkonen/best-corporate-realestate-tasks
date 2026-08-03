-- AlterTable: parcel boundary polygons for land without addresses
ALTER TABLE "Listing" ADD COLUMN "boundary" JSONB;

-- Photo statuses from the droning ledger (Droning_Ledger_Overview.xlsx).
-- One-shot: flips matched listings to HAS_PHOTOS with their latest flight
-- date. Listings someone has already demoted to NEEDS_MORE are respected.
UPDATE "Listing" AS l
SET "photoStatus" = 'HAS_PHOTOS', "lastShotAt" = v.shot
FROM (VALUES
    ('inv_001', '2025-05-05 12:00:00'::timestamp),
    ('inv_002', '2025-10-10 12:00:00'::timestamp),
    ('inv_005', '2025-07-07 12:00:00'::timestamp),
    ('inv_006', '2025-07-07 12:00:00'::timestamp),
    ('inv_007', '2026-03-09 12:00:00'::timestamp),
    ('inv_008', '2025-09-26 12:00:00'::timestamp),
    ('inv_009', '2025-09-26 12:00:00'::timestamp),
    ('inv_010', '2025-09-26 12:00:00'::timestamp),
    ('inv_011', '2025-09-26 12:00:00'::timestamp),
    ('inv_015', '2025-06-24 12:00:00'::timestamp),
    ('inv_016', '2025-10-13 12:00:00'::timestamp),
    ('inv_018', '2025-05-19 12:00:00'::timestamp),
    ('inv_020', '2025-07-23 12:00:00'::timestamp),
    ('inv_023', '2025-07-25 12:00:00'::timestamp),
    ('inv_024', '2025-06-10 12:00:00'::timestamp),
    ('inv_025', '2025-06-21 12:00:00'::timestamp),
    ('inv_027', '2025-06-03 12:00:00'::timestamp),
    ('inv_029', '2025-06-10 12:00:00'::timestamp),
    ('inv_032', '2026-06-12 12:00:00'::timestamp),
    ('inv_034', '2025-08-29 12:00:00'::timestamp),
    ('inv_037', '2025-08-29 12:00:00'::timestamp),
    ('inv_038', '2025-05-08 12:00:00'::timestamp),
    ('inv_040', '2025-07-12 12:00:00'::timestamp),
    ('inv_042', '2025-06-10 12:00:00'::timestamp),
    ('inv_044', '2026-06-11 12:00:00'::timestamp),
    ('inv_046', '2025-09-26 12:00:00'::timestamp),
    ('inv_050', '2025-05-19 12:00:00'::timestamp),
    ('inv_051', '2025-05-29 12:00:00'::timestamp),
    ('inv_054', '2026-03-06 12:00:00'::timestamp),
    ('inv_055', '2025-10-06 12:00:00'::timestamp),
    ('inv_059', '2025-06-24 12:00:00'::timestamp),
    ('inv_061', '2025-04-10 12:00:00'::timestamp),
    ('inv_063', '2025-08-01 12:00:00'::timestamp),
    ('inv_065', '2026-06-10 12:00:00'::timestamp),
    ('inv_066', '2025-06-10 12:00:00'::timestamp),
    ('inv_067', '2026-06-11 12:00:00'::timestamp),
    ('inv_068', '2026-06-11 12:00:00'::timestamp),
    ('inv_069', '2026-04-23 12:00:00'::timestamp),
    ('inv_070', '2025-10-08 12:00:00'::timestamp),
    ('inv_073', '2025-06-24 12:00:00'::timestamp),
    ('inv_074', '2025-07-11 12:00:00'::timestamp),
    ('inv_076', '2025-08-29 12:00:00'::timestamp),
    ('inv_081', '2025-06-24 12:00:00'::timestamp),
    ('inv_082', '2025-05-19 12:00:00'::timestamp),
    ('inv_083', '2025-05-19 12:00:00'::timestamp),
    ('inv_084', '2025-05-19 12:00:00'::timestamp),
    ('inv_085', '2025-05-19 12:00:00'::timestamp),
    ('inv_086', '2025-05-19 12:00:00'::timestamp),
    ('inv_087', NULL::timestamp)
) AS v(id, shot)
WHERE l."id" = v.id AND l."photoStatus" <> 'NEEDS_MORE';

-- Company-wide drone jobs from the ledger that are not in the listing
-- inventory (client work, closed listings). Pinned so the flight history
-- lives on one map. Idempotent: fixed ids, existing rows untouched.
INSERT INTO "Listing"
    ("id", "address", "city", "state", "postalCode",
     "latitude", "longitude", "photoStatus", "lastShotAt", "photoNote",
     "archived", "createdAt", "updatedAt")
SELECT v.id, v.address, v.city, v.state, v.zip,
       v.lat, v.lng, v.photo::"PhotoStatus", v.shot, v.note,
       false, now(), now()
FROM (VALUES
    ('led_001', '15812 State Route 56 West', 'Mount Sterling', 'OH', '43143', 39.7116167, -83.2426133, 'HAS_PHOTOS', '2024-11-01 12:00:00'::timestamp, NULL),
    ('led_002', '1150 Corrugated Way', 'Columbus', 'OH', '43201', 39.9879071, -82.9900632, 'HAS_PHOTOS', '2025-04-17 12:00:00'::timestamp, NULL),
    ('led_003', '0 S Union Street', 'Delaware', 'OH', '43015', 40.2982674, -83.0660248, 'HAS_PHOTOS', '2025-04-25 12:00:00'::timestamp, 'Street-level pin — move to the exact parcel'),
    ('led_004', 'Holt Road Center', 'Columbus', 'OH', NULL, 39.9110278, -83.1190923, 'HAS_PHOTOS', '2025-05-07 12:00:00'::timestamp, 'Street-level pin — move to the exact parcel'),
    ('led_005', '4020 Legend', 'Columbus', 'OH', '43230', 40.0605640, -82.8669725, 'HAS_PHOTOS', '2025-05-09 12:00:00'::timestamp, 'Street-level pin — move to the exact parcel'),
    ('led_006', '4323 Eastpoint Drive', 'Columbus', 'OH', '43232', 39.9272980, -82.8814401, 'HAS_PHOTOS', '2025-06-10 12:00:00'::timestamp, NULL),
    ('led_007', '677 S Hamilton', 'Columbus', 'OH', '43213', 39.9613012, -82.8768231, 'HAS_PHOTOS', '2025-06-20 12:00:00'::timestamp, NULL),
    ('led_008', '8200 Business Way', 'Plain City', 'OH', '43064', 40.1340787, -83.1986047, 'HAS_PHOTOS', '2025-07-11 12:00:00'::timestamp, NULL),
    ('led_009', '3395 Indianola', 'Columbus', 'OH', '43214', 40.0333402, -83.0012387, 'HAS_PHOTOS', '2025-07-24 12:00:00'::timestamp, NULL),
    ('led_010', '4100 Indianola', 'Columbus', 'OH', '43214', 40.0479745, -82.9994574, 'HAS_PHOTOS', '2025-07-24 12:00:00'::timestamp, NULL),
    ('led_011', '1359 E Fifth Avenue', 'Columbus', 'OH', '43219', 39.9852773, -82.9683217, 'HAS_PHOTOS', '2025-08-19 12:00:00'::timestamp, NULL),
    ('led_012', '369-375 S Central Avenue', 'Columbus', 'OH', '43223', 39.9501579, -83.0367879, 'HAS_PHOTOS', '2025-11-24 12:00:00'::timestamp, NULL),
    ('led_013', '2415 Maple Avenue', 'Zanesville', 'OH', '43701', 39.9677039, -82.0102803, 'HAS_PHOTOS', '2026-03-10 12:00:00'::timestamp, NULL),
    ('led_014', '511 Industrial Mile Road', 'Columbus', 'OH', '43228', 39.9423100, -83.1160748, 'HAS_PHOTOS', '2026-03-19 12:00:00'::timestamp, NULL),
    ('led_015', '2055 Riverside Drive', 'Upper Arlington', 'OH', '43221', 39.9970231, -83.0743860, 'HAS_PHOTOS', '2026-03-30 12:00:00'::timestamp, NULL),
    ('led_016', '5770 & 1677 Karl Ct', 'Columbus', 'OH', '43229', 40.0851599, -82.9748098, 'HAS_PHOTOS', '2026-04-02 12:00:00'::timestamp, 'Street-level pin — move to the exact parcel'),
    ('led_017', '300 & 333 E Ninth Avenue', 'Columbus', 'OH', '43201', 39.9933545, -82.9984713, 'HAS_PHOTOS', '2026-03-17 12:00:00'::timestamp, NULL),
    ('led_018', '507-509 S 4th Avenue', 'Columbus', 'OH', '43206', 39.9521475, -82.9947022, 'HAS_PHOTOS', '2026-06-05 12:00:00'::timestamp, NULL),
    ('led_019', '2086 E Dublin Granville', 'Columbus', 'OH', '43229', 40.0873844, -82.9614842, 'HAS_PHOTOS', '2026-04-15 12:00:00'::timestamp, NULL),
    ('led_020', '5795 Kilbannan Court', 'Dublin', 'OH', '43017', 40.1451862, -83.1446350, 'HAS_PHOTOS', '2026-06-12 12:00:00'::timestamp, NULL),
    ('led_021', '131 Lewis Avenue', 'Circleville', 'OH', '43113', 39.6054397, -82.9422123, 'HAS_PHOTOS', '2026-07-09 12:00:00'::timestamp, NULL),
    ('led_022', '2350 Scioto Harper Drive', 'Columbus', 'OH', '43204', 39.9676246, -83.0651744, 'HAS_PHOTOS', '2026-07-13 12:00:00'::timestamp, NULL),
    ('led_023', '9451 Crottinger Road', 'Plain City', 'OH', '43064', 40.1456042, -83.2575659, 'NO_PHOTOS', NULL::timestamp, 'On hold — waiting on client (ledger)'),
    ('led_024', '1673 E Main Street', 'Columbus', 'OH', '43205', 39.9573176, -82.9543109, 'NO_PHOTOS', NULL::timestamp, 'On hold — waiting on client (ledger)')
) AS v(id, address, city, state, zip, lat, lng, photo, shot, note)
ON CONFLICT ("id") DO NOTHING;
