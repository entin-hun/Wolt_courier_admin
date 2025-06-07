import axios from "axios";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import * as dateFnsTz from "date-fns-tz";
import Token from "../models/Token.js";
import Courier from "../models/Courier.js";
import CourierStats from "../models/CourierStats.js";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

class WoltDataCollector {
  constructor() {
    this.authUrl = "https://authentication.wolt.com/v1/wauth2/access_token";
    this.metricsUrl = `https://delivery-os-metrics.wolt.com/companies/${this.companyId}/metrics/v2`;
    this.earningsUrl = `https://delivery-os-earnings.wolt.com/companies/${this.companyId}/earnings`;
    this.cashBalancesUrl = `https://delivery-os-metrics.wolt.com/companies/${this.companyId}/cash-balances`;
    this.couriersUrl = `https://fleet-management.wolt.com/companies/${this.companyId}/couriers`;
    this.companyId = process.env.WOLT_companyId;
    this.timezone = process.env.TZ;
    this.codaApiToken = process.env.CODA_API_TOKEN;
    this.codaDocId = process.env.CODA_DOC_ID;
    this.codaTableId = process.env.CODA_TABLE_ID;
    this.codaRowsAPI = `https://coda.io/apis/v1/docs/${this.codaDocId}/tables/${this.codaTableId}/rows`;
  }
  //ok verified
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
  //ok verified
  getTimeRange(isFirstRun = false) {
    const now = Date.now();
    const hour = new Date(now).getHours();

    // If outside operating hours (6 AM - 11 PM), return null
    if (hour < 6 || hour >= 23) {
      return null;
    }

    if (isFirstRun) {
      // For first run of the day, get yesterday's data
      const yesterday = now - 24 * 60 * 60 * 1000;
      const fromDate = startOfDay(new Date(yesterday)).getTime();
      const toDate = endOfDay(new Date(yesterday)).getTime();
      return {
        from: Math.floor(fromDate / 1000), // Convert to seconds for API
        to: Math.floor(toDate / 1000), // Convert to seconds for API
        date: fromDate, // Keep in milliseconds for database
      };
    }

    // For continuous runs, get today's data
    const fromDate = startOfDay(new Date(now)).getTime();
    const toDate = now;
    return {
      from: Math.floor(fromDate / 1000), // Convert to seconds for API
      to: Math.floor(toDate / 1000), // Convert to seconds for API
      date: fromDate, // Keep in milliseconds for database
    };
  }

  //ok verified
  async fetchCouriers(accessToken) {
    try {
      if (!accessToken) {
        throw new Error("Access token is required for fetching couriers.");
      }

      logger.info("Fetching courier list...");

      const response = await axios.get(this.couriersUrl, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json, text/plain, */*",
        },
      });

      return response.data;
    } catch (error) {
      logger.error(
        "Error fetching couriers:",
        error.message,
        error.response?.data || "No response data"
      );
    }
    return null; // or return [];
  }
  //ok verified
  async fetchMetrics(accessToken, from, to) {
    try {
      if (!accessToken) {
        throw new Error("Access token is required for fetching metrics.");
      }

      if (!from || !to) {
        throw new Error("Invalid time range provided for fetching metrics.");
      }

      logger.info(
        `Fetching courier metrics from ${
          new Date(from * 1000).toISOString().split("T")[0]
        } to ${new Date(to * 1000).toISOString().split("T")[0]}...`
      );

      const response = await axios.get(this.metricsUrl, {
        params: { from, to },
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error(
        "Error fetching metrics:",
        error.message,
        error.response?.status,
        error.response?.data || "No response data"
      );

      throw error;
    }
  }
  //ok verified
  async fetchEarnings(accessToken, from, to) {
    try {
      if (!accessToken) {
        throw new Error("Access token is required for fetching Earnings.");
      }

      if (!from || !to) {
        throw new Error("Invalid time range provided for fetching earnings.");
      }

      logger.info(
        `Fetching courier earnings from ${
          new Date(from * 1000).toISOString().split("T")[0]
        } to ${new Date(to * 1000).toISOString().split("T")[0]}...`
      );

      const response = await axios.get(this.earningsUrl, {
        params: { from, to },
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      logger.error(
        "Error fetching earnings:",
        error.message,
        error.response?.status,
        error.response?.data || "No response data"
      );

      throw error;
    }
  }
  //ok verified
  async fetchCashBalances(accessToken) {
    try {
      if (!accessToken) {
        throw new Error("Access token is required for fetching cash balances.");
      }

      logger.info("Fetching cash balances...");

      const response = await axios.get(this.cashBalancesUrl, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json, text/plain, */*",
        },
      });

      return response.data;
    } catch (error) {
      logger.error(
        "Error fetching cash balances:",
        error.message,
        error.response?.status,
        error.response?.data || "No response data"
      );

      throw error;
    }
  }

  //ok verified
  async addCourierToCoda(courier) {
    try {
      if (!this.codaApiToken || !this.codaDocId || !this.codaTableId) {
        logger.warn("Coda API credentials not set, skipping Coda integration");
        return null;
      }
      const existingCourier = await Courier.findOne({
        courierId: courier.courierId,
      });
      if (existingCourier && existingCourier.codaIntegration?.codaRowId) {
        // If courier already has a Coda row ID, return it
        logger.info(
          `Courier ${courier.courierId} already in Coda with row ID: ${existingCourier.codaIntegration.codaRowId}`
        );
        return existingCourier.codaIntegration.codaRowId;
      }
      logger.info(`Adding courier ${courier.courierId} to Coda...`);

      // Convert date to "YYYY-MM-DD"
      const formatDate = (date) => {
        if (!date) return null;

        try {
          const parsedDate = new Date(date); // Ensure it's a Date object

          if (isNaN(parsedDate.getTime())) {
            console.error(`Invalid date format: ${date}`);
            return null;
          }

          return parsedDate.toISOString().split("T")[0]; // Extract YYYY-MM-DD
        } catch (error) {
          console.error(`Error parsing date: ${error.message}`);
          return null;
        }
      };

      // Send request to add courier to Coda
      const response = await axios.post(
        this.codaRowsAPI,
        {
          rows: [
            {
              cells: [
                { column: "c-UXdYDV-9EW", value: courier.courierId },
                { column: "c-rrbJOQgaBU", value: courier.firstName },
                { column: "c-6lSCCPKhmj", value: courier.lastName },
                { column: "c-I2SfTDe39D", value: courier.email },
                { column: "c-YHAnnuuDSO", value: courier.phone },
                { column: "c-o1qSJ2ByaT", value: courier.contractType },
                { column: "c-B0NOCItX3Y", value: courier.vehicleType },
                { column: "c-szUyRzXPbJ", value: courier.isDisabled },
                {
                  column: "c-k8okdVsMm1",
                  value: formatDate(courier.createdAt),
                },
                {
                  column: "c-gUSN_OdgCV",
                  value: formatDate(courier.updatedAt),
                },
              ],
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.codaApiToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      // Extract the new Coda row ID
      const codaRowId = response.data.addedRowIds[0];
      return codaRowId;
    } catch (error) {
      logger.error(
        `Error adding courier ${courier.courierId} to Coda:`,
        error.message
      );
      return null;
    }
  }

  //ok  verified
  async updateCodaCashBalance(codaRowId, amount) {
    try {
      if (!this.codaApiToken || !this.codaDocId || !this.codaTableId) {
        logger.warn("Coda API credentials not set, skipping Coda integration");
        return;
      }

      logger.info(`Updating cash balance for row ${codaRowId} in Coda...`);

      await axios.put(
        `https://coda.io/apis/v1/docs/${this.codaDocId}/tables/${this.codaTableId}/rows/${codaRowId}`,
        {
          row: {
            cells: [
              {
                column: "c-gE09kgXnI1",
                value: amount,
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
    } catch (error) {
      logger.error(
        `Error updating cash balance in Coda for row ${codaRowId}:`,
        error.message
      );
    }
  }

  //ok  verified
  async processCouriers(couriers) {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const courier of couriers) {
      try {
        // Convert Wolt API courier format to our model format with Unix timestamps
        function convertToUTCTimestamp(dateString) {
          try {
            dateString = dateString.split('T');
            const dateFormatRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/i;
            if (typeof dateString !== 'string' || !dateFormatRegex.test(dateString)) {
              return null;
            } else {
              const parts = dateString.split('-');
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10); // 1-indexed from string
              const day = parseInt(parts[2], 10);
              const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
              if (month === 2 && day > 29) {
                return null;
              } else if (utcDate.getUTCFullYear() !== year ||
                utcDate.getUTCMonth() !== (month - 1) ||
                utcDate.getUTCDate() !== day) {
                return null;
              }
              return utcDate.getTime();
            }
          } catch (err) {
            logger.info(`Error while converting timstamp to UTC for courier id :${courier.id} is :\n: ${err} `);
            return null;
          }
        }
        const toMilliseconds = (timestamp) =>
          timestamp ? new Date(timestamp).getTime() : null;

        const courierData = {
          courierId: courier.id,
          firstName: courier.firstName,
          lastName: courier.lastName,
          name: courier.name,
          email: courier.email,
          phone: courier.phone,
          contractType: courier.contractType,
          vehicleType: courier.vehicleType,
          allowShiftReservation: courier.allowShiftReservation,
          capabilities: courier.capabilities,
          contractValidFrom: toMilliseconds(courier.contractValidFrom),
          isDisabled: courier.isDisabled,
          createdAt: toMilliseconds(courier.createdAt) || Date.now(),
          updatedAt: toMilliseconds(courier.updatedAt) || Date.now(),
        };

        // Check if courier exists
        const existingCourier = await Courier.findOne({
          courierId: courier.id,
        });

        if (existingCourier) {
          // Update existing courier
          await Courier.updateOne(
            { courierId: courier.id },
            { $set: courierData }
          );
          logger.info(`Updated existing courier: ${courier.id}`);
          const codaRowId = await this.addCourierToCoda(existingCourier);
        } else {
          // Create new courier
          const newCourier = await Courier.create(courierData);

          // Add to Coda if not already there
          const codaRowId = await this.addCourierToCoda(newCourier);

          if (codaRowId) {
            // Update courier with Coda row ID
            await Courier.updateOne(
              { courierId: courier.id },
              {
                $set: {
                  "codaIntegration.codaRowId": codaRowId,
                  "codaIntegration.lastSynced": Date.now(),
                },
              }
            );
          }
        }
        // Add delay before next request
        await delay(500); // Wait for 300ms before processing the next courier
      } catch (error) {
        logger.error(`Error processing courier ${courier.id}:`, error.message);
      }
    }
  }
  //ok VERIFIED
  async processMetrics(metrics, date) {
    for (const metric of metrics) {
      try {
        const { courierId, ...metricData } = metric;
        if (!courierId) {
          logger.warn("Skipping metric processing due to missing courierId");
          continue;
        }
        // Convert metric data to our model format
        const statsData = {};

        // Process each metric field
        for (const [key, value] of Object.entries(metricData)) {
          if (
            value &&
            typeof value === "object" &&
            "value" in value &&
            "updatedAt" in value
          ) {
            // Convert updatedAt to Unix timestamp
            let updatedAtTimestamp;
            try {
              updatedAtTimestamp = value.updatedAt
                ? new Date(value.updatedAt).getTime()
                : Date.now();
              // Check if the timestamp is valid
              if (isNaN(updatedAtTimestamp)) {
                logger.warn(
                  `Invalid updatedAt date for metric ${key} of courier ${courierId}: ${value.updatedAt}, using current timestamp instead`
                );
                updatedAtTimestamp = Date.now();
              }
            } catch (error) {
              logger.warn(
                `Error parsing updatedAt date for metric ${key} of courier ${courierId}: ${error.message}, using current timestamp instead`
              );
              updatedAtTimestamp = Date.now();
            }

            statsData[key] = {
              value: value.value,
              updatedAt: updatedAtTimestamp,
            };
          }
        }

	// Generate current timestamp for latestUpdate
        const currentTimestamp = Date.now();

        // Upsert the courier stats
        await CourierStats.findOneAndUpdate(
          {
            courierId,
            date: startOfDay(new Date(date)).getTime(),
          },
          {
            $set: { ...statsData, latestUpdate: currentTimestamp },
          },
          {
            upsert: true,
            new: true,
          }
        );
      } catch (error) {
        logger.error(
          `Error processing metrics for courier ${metric.courierId}:`,
          error.message
        );
      }
    }
  }
  //ok verified
  async processEarnings(earnings, date) {
    for (const earning of earnings) {
      try {
        const { courierId, companyId, aggregatedTransactions } = earning;
        if (!courierId || !aggregatedTransactions) {
          logger.warn(
            `Missing required data for earnings processing: ${JSON.stringify(
              earning
            )}`
          );
          continue;
        }

        // Transform transactions into earnings records
        const earningsRecords = aggregatedTransactions.map((transaction) => ({
          amount: transaction.amount,
          currencyCode: transaction.currency,
          transactionType: transaction.transactionType,
          companyId: companyId || this.companyId,
          updatedAt: Date.now(),
        }));

	// Generate current timestamp for latestUpdate
        const currentTimestamp = Date.now();

        // Upsert the courier stats, pushing new earnings records to the array
        await CourierStats.findOneAndUpdate(
          {
            courierId,
            date: startOfDay(new Date(date)).getTime(),
          },
          {
            $push: {
              earnings: {
                $each: earningsRecords,
              },
            },
	$set: {
              latestUpdate: currentTimestamp,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );

        logger.info(
          `Added ${earningsRecords.length} new earnings transactions for courier ${courierId}`
        );
      } catch (error) {
        logger.error(
          `Error processing earnings for courier ${earning.courierId}:`,
          error.message
        );
      }
    }
  }

  //ok verified
  async processCashBalances(balances) {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const balance of balances) {
      try {
        const { courierId, companyId, amount, currencyCode, updatedAt } =
          balance;

        // First, check if courier exists
        const courier = await Courier.findOne({ courierId });
        if (!courier) {
          logger.warn(
            `Skipping cash balance update: Courier ${courierId} not found in database`
          );
          continue;
        }

        // Convert updatedAt to Unix timestamp
        let updatedAtTimestamp;
        try {
          updatedAtTimestamp = updatedAt
            ? new Date(updatedAt).getTime()
            : Date.now();

          if (isNaN(updatedAtTimestamp)) {
            logger.warn(
              `Invalid updatedAt timestamp for courier ${courierId}, using current timestamp`
            );
            updatedAtTimestamp = Date.now();
          }
        } catch (error) {
          logger.warn(
            `Error parsing updatedAt for courier ${courierId}: ${error.message}`
          );
          updatedAtTimestamp = Date.now();
        }


	// Generate current timestamp for latestUpdate
        const currentTimestamp = Date.now();

        // Update courier stats with current cash balance
        await CourierStats.findOneAndUpdate(
          {
            courierId,
            date: startOfDay(new Date()).getTime(),
          },
          {
            $set: {
              cashBalance: {
                amount: amount,
                updatedAt: updatedAtTimestamp,
                currencyCode: currencyCode || "HUF",
                companyId: companyId || this.companyId,
              },
              latestUpdate: currentTimestamp,

            },
          },
          {
            upsert: true,
            new: true,
          }
        );

        logger.info(
          `Updated cash balance for courier ${courierId}: ${amount} ${currencyCode}`
        );

        // Update Coda if integration exists
        if (courier.codaIntegration?.codaRowId) {
          await this.updateCodaCashBalance(
            courier.codaIntegration.codaRowId,
            amount
          );

          // Update last synced timestamp
          await Courier.updateOne(
            { courierId },
            {
              $set: {
                "codaIntegration.lastSynced": Date.now(),
              },
            }
          );
          logger.info(`Updated Coda integration for courier ${courierId}`);
        }

        // Add delay before processing next balance
        await delay(800);
      } catch (error) {
        logger.error(
          `Error processing cash balance for courier ${balance.courierId}:`,
          error.message
        );
      }
    }
  }

  async collectData(isFirstRun = false) {
    try {
      logger.info(`Starting data collection at ${new Date().toISOString()}`);

      // Get time range based on current time
      const timeRange = this.getTimeRange(isFirstRun);
      if (!timeRange) {
        logger.info(
          "Outside operating hours (6 AM - 11 PM), skipping data collection"
        );
        return;
      }

      const { from, to, date } = timeRange;

      // Get valid access token
      const accessToken = await this.getValidToken();

      // Fetch and process couriers
      const couriers = await this.fetchCouriers(accessToken);
      await this.processCouriers(couriers);

      // Fetch and process metrics
      const metrics = await this.fetchMetrics(accessToken, from, to);
      await this.processMetrics(metrics, date);

      // Fetch and process earnings
      const earnings = await this.fetchEarnings(accessToken, from, to);
      await this.processEarnings(earnings, date);

      // Fetch and process cash balances
      const cashBalances = await this.fetchCashBalances(accessToken);
      await this.processCashBalances(cashBalances);

      logger.info(`Data collection completed at ${new Date().toISOString()}`);
    } catch (error) {
      logger.error("Error during data collection:", error.message);
    }
  }
}

export default new WoltDataCollector();
