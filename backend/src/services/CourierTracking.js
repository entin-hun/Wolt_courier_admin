// services/CourierTracking.js
import axios from "axios";
import { logger } from "../utils/logger.js";
import Courier from "../models/Courier.js";
import dotenv from "dotenv";
import csv from "csv-parser";
import fs from "fs";
import Token from "../models/Token.js";

dotenv.config();

/**
 * CourierTracking class
 * Handles tracking of courier statuses, locations, and assigns them to nearby hotspots
 * Integrates with Wolt delivery API and Coda for data storage
 */
class CourierTracking {
  constructor() {
    // Company identifier used in API requests
    this.companyId = "a9f4f268-7112-4572-bebd-473df4a1c2c4";
    //  URLs for various API endpoints
    //this.trackingUrl = `https://delivery-os-tracking.wolt.com/companies/a9f4f268-7112-4572-bebd-473df4a1c2c4/delivery-statuses?updatedAfter=1740457633`;
    this.trackingBaseUrl = `https://delivery-os-tracking.wolt.com/companies/a9f4f268-7112-4572-bebd-473df4a1c2c4/delivery-statuses`;
    this.authUrl = "https://authentication.wolt.com/v1/wauth2/access_token";
    //this.locationUrl = `https://delivery-os-tracking.wolt.com/companies/a9f4f268-7112-4572-bebd-473df4a1c2c4/locations?updatedAfter=1740506393`;
    this.locationBaseUrl = `https://delivery-os-tracking.wolt.com/companies/${this.companyId}/locations`;
    this.courierInfo = `https://fleet-management.wolt.com/companies/a9f4f268-7112-4572-bebd-473df4a1c2c4/couriers`;
    // Google Maps Distance Matrix API for calculating distances
    this.distanceMatrixUrl =
      "https://maps.googleapis.com/maps/api/distancematrix/json";
    // API keys and IDs loaded from environment variables
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.codaApiToken = process.env.CODA_API_TOKEN;
    this.codaDocId = process.env.CODA_DOC_ID;
    this.codaHotspotTableId = "grid-VNIaaKgG7W";
  }

  // Generate tracking URL with current timestamp - 60 seconds
  getTrackingUrl() {
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    return `${this.trackingBaseUrl}?updatedAfter=${oneMinuteAgo}`;
  }

  // Generate location URL with current timestamp - 63 seconds
  getLocationUrl() {
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 63;
    return `${this.locationBaseUrl}?updatedAfter=${oneMinuteAgo}`;
  }

  async refreshToken(refreshToken) {
    try {
      logger.info("Refreshing auth tokens...");

      const response = await axios.post(
        this.authUrl,
        new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
        {
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      const expiresAt = Date.now() + expires_in * 1000;

      // Update existing token or create if none exists
      await Token.findOneAndUpdate(
        {}, // empty filter to match any document
        {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          updatedAt: Date.now(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      logger.info(
        `Tokens updated successfully. Expires in ${expires_in} seconds.`
      );
      return access_token;
    } catch (error) {
      logger.error("Error refreshing token:", error.message);
      throw error;
    }
  }
  //ok verified
  async getValidToken() {
    try {
      // Find the most recent valid token
      const token = await Token.findOne({
        expiresAt: { $gt: Date.now() },
      }).sort({ expiresAt: -1 });

      if (token) {
        // If token expires in less than 5 minutes, refresh it
        if (token.expiresAt - Date.now() < 5 * 60 * 1000) {
          return await this.refreshToken(token.refreshToken);
        }
        return token.accessToken;
      }

      // No valid token found, try to refresh using environment variable
      const envRefreshToken = process.env.WOLT_REFRESH_TOKEN;
      if (!envRefreshToken) {
        throw new Error("No valid tokens found and WOLT_REFRESH_TOKEN not set");
      }

      return await this.refreshToken(envRefreshToken);
    } catch (error) {
      logger.error("Error getting valid token:", error.message);
      throw error;
    }
  }

  async fetchCouriersWithStatus(accessToken) {
    try {
      logger.info("Fetching courier statuses...");

      const response = await axios.get(this.getTrackingUrl(), {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
      });

      const idleCouriers = response.data.filter(
        (courier) => courier.status === "idle"
      );

      logger.info(`Found ${idleCouriers.length} couriers with idle status`);

      console.log(idleCouriers);

      return idleCouriers;
    } catch (error) {
      logger.error("Error fetching couriers with status:", error);
      throw error;
    }
  }

  async fetchCourierLocations(courierIds, accessToken) {
    try {
      if (!courierIds.length) {
        return [];
      }

      logger.info(`Fetching locations for ${courierIds.length} couriers...`);

      const response = await axios.get(this.getLocationUrl(), {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
      });

      // Filter to only get locations for our idle couriers
      const courierLocations = response.data
        .filter((location) => courierIds.includes(location.courierId)) // First, filter matching couriers
        .map((location) => ({
          courierId: location.courierId,
          lat: location.latitude,
          lng: location.longitude,
          updatedAt: location.updatedAt,
        }));

      return courierLocations;
    } catch (error) {
      logger.error("Error fetching courier locations:", error.message);
      throw error;
    }
  }

  async fetchCourierInfo(courierId, accessToken) {
    try {
      //const accessToken = await this.getValidToken();
      // const accessToken = process.env.WOLT_ACCESS_TOKEN;

      logger.info(`Fetching info for courier ${courierId}...`);

      const response = await axios.get(`${this.courierInfo}/${courierId}`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
      });

      return response.data;
    } catch (error) {
      logger.error(
        `Error fetching courier info for ${courierId}:`,
        error.message
      );
      throw error;
    }
  }

  async getHotspots() {
    try {
      const hotspots = [];

      return new Promise((resolve, reject) => {
        fs.createReadStream("src/hotspots.csv")
          .pipe(csv())
          .on("data", (row) => {
            hotspots.push({
              team: row.Team.trim(),
              name: row.name,
              lat: parseFloat(row.lat),
              lng: parseFloat(row.lng),
            });
          })
          .on("end", () => {
            logger.info(`Loaded ${hotspots.length} hotspots from CSV.`);
            resolve(hotspots);
          })
          .on("error", (error) => {
            logger.error("Error reading hotspots from CSV:", error.message);
            reject(error);
          });
      });
    } catch (error) {
      logger.error("Error fetching hotspots:", error.message);
      throw error;
    }
  }

  async findNearestHotspot(courierLocation, accessToken) {
    try {
      // Get all hotspots
      const allHotspots = await this.getHotspots();
      if (!allHotspots || allHotspots.length === 0) {
        throw new Error("No hotspots available");
      }

      // Get courier info to find their team
      const courierInfo = await this.fetchCourierInfo(
        courierLocation.courierId,
        courierLocation.accessTokenNew
      );
      const courierTeam = courierInfo.team || "";
      logger.info(
        `Courier ${courierLocation.courierId} belongs to team: ${courierTeam}`
      );

      // Filter hotspots based on courier's team
      const teamHotspots = allHotspots.filter(
        (hotspot) => hotspot.team.toLowerCase() === courierTeam.toLowerCase()
      );
      if (!teamHotspots || teamHotspots.length === 0) {
        const errorMsg = `No hotspots found for team: ${courierTeam}. Skipping this courier.`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      logger.info(
        `Found ${teamHotspots.length} hotspots for team ${courierTeam}`
      );

      // Prepare origins (courier location)
      const origins = `${courierLocation.lat},${courierLocation.lng}`;

      // Prepare destinations (team-specific hotspots)
      const destinations = teamHotspots
        .map((spot) => `${spot.lat},${spot.lng}`)
        .join("|");
      logger.info(
        `Calculating distance from (Courier ID ${courierLocation.courierId}, Team ${courierTeam}) (${origins}) to ${teamHotspots.length} team hotspots`
      );

      const response = await axios.get(this.distanceMatrixUrl, {
        params: {
          origins,
          destinations,
          mode: "bicycling", // or 'driving' based on your needs
          key: this.googleMapsApiKey,
        },
      });

      // Process the response to find the nearest hotspot
      const distances = response.data.rows[0].elements;
      let shortestDistance = Infinity;
      let nearestHotspotIndex = -1;

      distances.forEach((element, index) => {
        logger.info(
          `Distance to ${teamHotspots[index].name}: ${
            element.distance?.text || "N/A"
          }`
        );

        if (
          element.status === "OK" &&
          element.distance &&
          element.distance.value < shortestDistance
        ) {
          // Store the original distance value in meters
          shortestDistance = element.distance.value;
          nearestHotspotIndex = index;
        }
      });

      if (nearestHotspotIndex === -1) {
        throw new Error("Could not determine nearest hotspot");
      }

      // Convert to km only for display and return value
      const distanceInKm = shortestDistance / 1000;

      logger.info(
        `Nearest hotspot for courier ${
          courierLocation.courierId
        } (Team ${courierTeam}) is ${
          teamHotspots[nearestHotspotIndex].name
        } at ${distanceInKm.toFixed(3)}km`
      );

      return {
        ...teamHotspots[nearestHotspotIndex],
        distance: distanceInKm,
      };
    } catch (error) {
      logger.error(`Error finding nearest hotspot: ${error.message}`);
      throw error;
    }
  }

  async updateCourierHotspot(courierId, hotspot) {
    try {
      // First, get the courier to find their Coda row ID
      const courier = await Courier.findOne({ courierId });

      if (!courier || !courier.codaIntegration?.codaRowId) {
        logger.warn(
          `Courier ${courierId} not found or has no Coda integration`
        );
        return false;
      }

      const codaRowId = courier.codaIntegration.codaRowId;

      logger.info(
        `Updating hotspot for courier ${courierId} in Coda (row ${codaRowId})...`
      );

      // Update the hotspot in Coda
      await axios.put(
        `https://coda.io/apis/v1/docs/${this.codaDocId}/tables/${this.codaHotspotTableId}/rows/${codaRowId}`,
        {
          row: {
            cells: [
              {
                column: "c-BGpDkBo8fv", // Replace with your actual column ID
                value: hotspot.name,
              },
              {
                column: "c-QO4GGRJMWE", // Replace with your actual column ID
                value: hotspot.distance,
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.codaApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      logger.info(
        `Updated hotspot for courier ${courierId} to ${hotspot.name} (Team: ${hotspot.team})`
      );
      return true;
    } catch (error) {
      logger.error(`Error updating courier hotspot in Coda: ${error.message}`);
      return false;
    }
  }

  async trackIdleCouriers() {
    try {
      logger.info("Starting idle courier tracking...");

      const accessToken = await this.getValidToken();

      // 1. Fetch couriers with idle status
      const idleCouriers = await this.fetchCouriersWithStatus(accessToken);

      if (!idleCouriers.length) {
        logger.info("No idle couriers found, skipping tracking");
        return;
      }

      // 2. Extract courier IDs
      const courierIds = idleCouriers.map((courier) => courier.courierId);

      // 3. Fetch locations for these couriers
      const courierLocations = await this.fetchCourierLocations(
        courierIds,
        accessToken
      );

      const accessTokenNew = await this.getValidToken();
      // 4. Process each courier location
      for (const location of courierLocations) {
        try {
          // 5. Find nearest hotspot based on courier's team
          const nearestHotspot = await this.findNearestHotspot({
            lat: location.lat,
            lng: location.lng,
            courierId: location.courierId,
            accessTokenNew,
          });

          // 6. Update in Coda
          await this.updateCourierHotspot(location.courierId, nearestHotspot);
        } catch (error) {
          logger.error(
            `Error processing courier ${location.courierId}: ${error.message}`
          );
          // Continue with next courier
        }
      }

      logger.info("Idle courier tracking completed");
    } catch (error) {
      logger.error("Error during idle courier tracking:", error.message);
    }
  }
}

export default new CourierTracking();
