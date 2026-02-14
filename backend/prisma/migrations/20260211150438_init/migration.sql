-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('CREATED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('owner', 'participant');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('SOS', 'BREAKDOWN', 'ACCIDENT', 'MEDICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "push_token" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" TEXT NOT NULL,
    "ride_code" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'CREATED',
    "pickup_lat" DECIMAL(10,8) NOT NULL,
    "pickup_lng" DECIMAL(11,8) NOT NULL,
    "pickup_address" TEXT,
    "destination_lat" DECIMAL(10,8) NOT NULL,
    "destination_lng" DECIMAL(11,8) NOT NULL,
    "destination_address" TEXT,
    "rideName" VARCHAR(100),
    "route_polyline" TEXT,
    "route_distance" INTEGER,
    "route_duration" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "actual_distance" INTEGER,
    "actual_duration" INTEGER,
    "avg_speed" DECIMAL(5,2),
    "max_speed" DECIMAL(5,2),

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_participants" (
    "ride_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),

    CONSTRAINT "ride_participants_pkey" PRIMARY KEY ("ride_id","user_id")
);

-- CreateTable
CREATE TABLE "location_updates" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "speed" DECIMAL(5,2),
    "heading" DECIMAL(5,2),
    "accuracy" DECIMAL(6,2),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waypoints" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "name" VARCHAR(100),
    "sequence_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waypoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regroup_points" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "name" VARCHAR(100),
    "wait_until_all" BOOLEAN NOT NULL DEFAULT true,
    "wait_duration" INTEGER,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "regroup_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_alerts" (
    "id" TEXT NOT NULL,
    "ride_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "alert_type" "AlertType" NOT NULL DEFAULT 'SOS',
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "message" TEXT,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "acknowledged_by" TEXT,

    CONSTRAINT "emergency_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_clerk_user_id_idx" ON "users"("clerk_user_id");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "rides_ride_code_key" ON "rides"("ride_code");

-- CreateIndex
CREATE INDEX "rides_ride_code_idx" ON "rides"("ride_code");

-- CreateIndex
CREATE INDEX "rides_owner_id_idx" ON "rides"("owner_id");

-- CreateIndex
CREATE INDEX "rides_status_idx" ON "rides"("status");

-- CreateIndex
CREATE INDEX "rides_created_at_idx" ON "rides"("created_at" DESC);

-- CreateIndex
CREATE INDEX "ride_participants_ride_id_idx" ON "ride_participants"("ride_id");

-- CreateIndex
CREATE INDEX "ride_participants_user_id_idx" ON "ride_participants"("user_id");

-- CreateIndex
CREATE INDEX "location_updates_ride_id_timestamp_idx" ON "location_updates"("ride_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "location_updates_user_id_timestamp_idx" ON "location_updates"("user_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "waypoints_ride_id_sequence_order_idx" ON "waypoints"("ride_id", "sequence_order");

-- CreateIndex
CREATE INDEX "regroup_points_ride_id_is_active_idx" ON "regroup_points"("ride_id", "is_active");

-- CreateIndex
CREATE INDEX "emergency_alerts_ride_id_status_idx" ON "emergency_alerts"("ride_id", "status");

-- CreateIndex
CREATE INDEX "emergency_alerts_user_id_idx" ON "emergency_alerts"("user_id");

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_participants" ADD CONSTRAINT "ride_participants_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_participants" ADD CONSTRAINT "ride_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_updates" ADD CONSTRAINT "location_updates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_updates" ADD CONSTRAINT "location_updates_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waypoints" ADD CONSTRAINT "waypoints_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regroup_points" ADD CONSTRAINT "regroup_points_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regroup_points" ADD CONSTRAINT "regroup_points_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_alerts" ADD CONSTRAINT "emergency_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
