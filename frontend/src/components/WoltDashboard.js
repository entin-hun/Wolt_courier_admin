import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { API_BASE_URL } from "../config";

// Create a light theme
const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
});

// Helper function to get date from X days ago
const getDateXDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
};

// Format date as YYYY-MM-DD for input fields
const formatDateForInput = (date) => {
  return date.toISOString().split("T")[0];
};

const WoltDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize date range to last 14 days
  const today = new Date();
  const fourteenDaysAgo = getDateXDaysAgo(14);

  const [fromDate, setFromDate] = useState(formatDateForInput(fourteenDaysAgo));
  const [toDate, setToDate] = useState(formatDateForInput(today));
  const [lastUpdated, setLastUpdated] = useState(null);
  const [balance, setBalance] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get courierId from URL query parameters
  const queryParams = new URLSearchParams(location.search);
  const courierId = queryParams.get("courierId");

  // Column visibility state with colors based on image
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    tar: true,
    tcr: true,
    dph: true,
    onlineHours: true,
    onTaskHours: true,
    idleHours: true,
    numDeliveries: true,
    tarShownTasks: true,
    tarStartedTasks: true,
    taskDistanceCost: true,
    shiftGuarantee: true,
    upfrontPricingAdjustment: true,
    taskPickupDistanceCost: true,
    taskBaseCost: true,
    tip: true,
    taskCapabilityCost: true,
    manual: true,
    cashReceived: true,
  });

  // Column definitions with metadata and color coding
  const columns = [
    {
      id: "date",
      label: "Date",
      visible: visibleColumns.date,
      aggregate: null,
      color: "White",
    },
    {
      id: "tar",
      label: "TAR",
      visible: visibleColumns.tar,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "tcr",
      label: "TCR",
      visible: visibleColumns.tcr,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "dph",
      label: "DPH",
      visible: visibleColumns.dph,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "onlineHours",
      label: "Total Online Time",
      visible: visibleColumns.onlineHours,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "onTaskHours",
      label: "Total On-Task Time",
      visible: visibleColumns.onTaskHours,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "idleHours",
      label: "Total Idle Time",
      visible: visibleColumns.idleHours,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "numDeliveries",
      label: "Deliveries",
      visible: visibleColumns.numDeliveries,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "tarShownTasks",
      label: "Tasks Shown",
      visible: visibleColumns.tarShownTasks,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "tarStartedTasks",
      label: "Tasks Started",
      visible: visibleColumns.tarStartedTasks,
      aggregate: "avg",
      color: "purple",
    },
    {
      id: "taskDistanceCost",
      label: "Task Distance Cost",
      visible: visibleColumns.taskDistanceCost,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "shiftGuarantee",
      label: "Shift Guarantee",
      visible: visibleColumns.shiftGuarantee,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "upfrontPricingAdjustment",
      label: "Upfront Pricing Adjustment",
      visible: visibleColumns.upfrontPricingAdjustment,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "taskPickupDistanceCost",
      label: "Task Pickup Distance Cost",
      visible: visibleColumns.taskPickupDistanceCost,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "taskBaseCost",
      label: "Task Base Cost",
      visible: visibleColumns.taskBaseCost,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "tip",
      label: "Tip",
      visible: visibleColumns.tip,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "taskCapabilityCost",
      label: "Task Capability Cost",
      visible: visibleColumns.taskCapabilityCost,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "manual",
      label: "Manual",
      visible: visibleColumns.manual,
      aggregate: "sum",
      color: "green",
    },
    {
      id: "cashReceived",
      label: "Cash Received",
      visible: visibleColumns.cashReceived,
      aggregate: "sum",
      color: "green",
    },
  ];

  // Format date to DD-MM
  const formatDate = (timestamp) => {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${day}-${month}`;
  };

  // Convert date string to Unix milliseconds
  const dateToUnixMilliseconds = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.getTime();
  };

  const getMinutesSinceUpdate = () => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diff = now - new Date(lastUpdated);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const calculateAggregates = (data) => {
    const result = {};
    columns.forEach((col) => {
      if (col.aggregate === "sum") {
        result[col.id] = data.reduce((sum, row) => sum + (row[col.id] || 0), 0);
      } else if (col.aggregate === "avg") {
        let sum = 0,
          count = 0;
        data.forEach((row) => {
          if (row[col.id] !== undefined && row[col.id] !== null) {
            sum += row[col.id];
            count += 1;
          }
        });
        result[col.id] = count > 0 ? sum / count : 0;
      }
    });
    return result;
  };

  const calculateBalance = (data) => {
    let total = 0;
    data.forEach((row) => {
      columns.forEach((col) => {
        if (col.color === "green" && col.id !== "cashReceived" && row[col.id]) {
          total += row[col.id];
        }
      });
      if (row.cashReceived) {
        total -= row.cashReceived;
      }
    });
    return total;
  };

  const processFilteredStats = (filteredStats) => {
    // Process the filtered stats response
    if (!Array.isArray(filteredStats) || filteredStats.length === 0) {
      return [];
    }

    return filteredStats
      .map((dayData) => {
        // Check if stats array exists and has at least one entry
        if (
          !dayData.stats ||
          !Array.isArray(dayData.stats) ||
          dayData.stats.length === 0
        ) {
          return null; // Skip this day if no stats
        }

        const stats = dayData.stats[0]; // Get the first stats entry for the day

        // Calculate earnings by transaction type
        const earnings = {
          taskDistanceCost:
            (stats.earnings || [])
              .filter(
                (e) =>
                  e.transactionType === "transaction_type_task_distance_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          shiftGuarantee:
            (stats.earnings || [])
              .filter(
                (e) => e.transactionType === "transaction_type_shift_guarantee"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          upfrontPricingAdjustment:
            (stats.earnings || [])
              .filter(
                (e) =>
                  e.transactionType ===
                  "transaction_type_upfront_pricing_adjustment"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          taskPickupDistanceCost:
            (stats.earnings || [])
              .filter(
                (e) =>
                  e.transactionType ===
                  "transaction_type_task_pickup_distance_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          taskBaseCost:
            (stats.earnings || [])
              .filter(
                (e) => e.transactionType === "transaction_type_task_base_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          tip:
            (stats.earnings || [])
              .filter((e) => e.transactionType === "transaction_type_tip")
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          taskCapabilityCost:
            (stats.earnings || [])
              .filter(
                (e) =>
                  e.transactionType === "transaction_type_task_capability_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          manual:
            (stats.earnings || [])
              .filter((e) => e.transactionType === "transaction_type_manual")
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
        };

        return {
          date: formatDate(dayData.date),
          tar: stats.tar?.value || 0,
          tcr: stats.tcr?.value || 0,
          dph: stats.dph?.value || 0,
          onlineHours: stats.onlineHours?.value || 0,
          onTaskHours: stats.onTaskHours?.value || 0,
          idleHours: stats.idleHours?.value || 0,
          numDeliveries: stats.numDeliveries?.value || 0,
          tarShownTasks: stats.tarShownTasks?.value || 0,
          tarStartedTasks: stats.tarStartedTasks?.value || 0,
          ...earnings,
          cashReceived: stats.cashBalance?.amount || 0,
        };
      })
      .filter(Boolean); // Remove any null entries
  };

  const fetchCourierData = useCallback(async () => {
    if (!courierId) {
      navigate("/"); // Redirect to search page if no courier ID
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Always use filtered-stats API with date range
      const fromTimestamp = dateToUnixMilliseconds(fromDate);
      const toTimestamp = dateToUnixMilliseconds(toDate);

      if (!fromTimestamp || !toTimestamp) {
        throw new Error("Invalid date format");
      }

      const url = `${API_BASE_URL}/courier/filtered-stats?courierId=${courierId}&from=${fromTimestamp}&to=${toTimestamp}`;

      const response = await fetch(url);
      const data = await response.json();
      console.log("API Response:", data);

      // For filtered-stats endpoint, success is implied by array data
      if (Array.isArray(data) && data.length > 0) {
        // Process filtered stats response - data is the array directly
        const formattedData = processFilteredStats(data);

        // Find the latest update time across all days
        const latestUpdateTime = Math.max(
          ...data.map((day) => day.stats[0]?.latestUpdate || 0)
        );

        console.log("Formatted data:", formattedData);
        setRows(formattedData);
        setLastUpdated(new Date(latestUpdateTime));
        setBalance(calculateBalance(formattedData));
      } else {
        setError("No data found for the selected date range");
        setRows([]);
        setBalance(0);
      }
    } catch (error) {
      console.error("Error fetching courier data:", error);
      setError("Error fetching data: " + error.message);
      setRows([]);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [courierId, fromDate, toDate, navigate]);

  // Load data when courier ID or date filters change
  useEffect(() => {
    fetchCourierData();
  }, [fetchCourierData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchCourierData();
  };

  const handleBackToSearch = () => {
    navigate("/");
  };

  const toggleColumn = (columnId) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnId]: !prev[columnId],
    }));
  };

  const aggregates = calculateAggregates(rows);

  const getCellColor = (columnId) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column || !column.color) return undefined;

    if (theme.palette.mode === "light") {
      if (column.color === "purple") {
        return "#e0d7f1";
      } else if (column.color === "White") {
        return "#f5f5f5"; // Light gray for white in light mode
      } else {
        return "#d7f1d7"; // Green
      }
    } else {
      if (column.color === "purple") {
        return "#4a148c";
      } else if (column.color === "White") {
        return "#303030"; // Dark gray for white in dark mode
      } else {
        return "#1b5e20"; // Dark green
      }
    }
  };

  const getHeaderColor = (columnId) => {
    const column = columns.find((col) => col.id === columnId);
    if (!column || !column.color) return undefined;

    if (theme.palette.mode === "light") {
      if (column.color === "purple") {
        return "#d6c6e9";
      } else if (column.color === "White") {
        return "#e0e0e0"; // Slightly darker gray for headers in light mode
      } else {
        return "#c6e9c6"; // Green
      }
    } else {
      if (column.color === "purple") {
        return "#6a1b9a";
      } else if (column.color === "null") {
        return "#424242"; // Slightly lighter gray for headers in dark mode
      } else {
        return "#2e7d32"; // Dark green
      }
    }
  };

  // Format number with space as thousand separator
  const formatNumber = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2, maxWidth: "100%" }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title={`Courier Dashboard - ID: ${courierId}`}
            action={
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToSearch}
                variant="outlined"
                size="small"
              >
                Back to Search
              </Button>
            }
          />
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", md: "center" },
                gap: 2,
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body1" fontWeight="bold">
                  Balance:
                </Typography>
                <Typography variant="h6">
                  {formatNumber(Math.round(balance))} HUF
                </Typography>
              </Box>
              {lastUpdated && (
                <Typography variant="body2" color="text.secondary">
                  Last updated: {getMinutesSinceUpdate()}
                </Typography>
              )}
            </Box>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    From Date
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    To Date
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={4}
                  sx={{ display: "flex", alignItems: "flex-end" }}
                >
                  <Button
                    variant="contained"
                    type="submit"
                    fullWidth
                    sx={{ height: 40 }}
                  >
                    Apply Date Filters
                  </Button>
                </Grid>
              </Grid>
            </form>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 2 }}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight="medium">
                    Column Visibility
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={1}>
                    {columns.map((col) => (
                      <Grid item xs={6} md={4} lg={2} key={col.id}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={visibleColumns[col.id]}
                              onChange={() => toggleColumn(col.id)}
                              size="small"
                            />
                          }
                          label={
                            <Typography
                              variant="body2"
                              sx={{
                                color:
                                  col.color === "purple"
                                    ? "purple"
                                    : col.color === "green"
                                    ? "green"
                                    : "inherit",
                              }}
                            >
                              {col.label}
                            </Typography>
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Box>

            <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead align="center">
                  <TableRow>
                    {columns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <TableCell
                          key={col.id}
                          sx={{
                            backgroundColor: getHeaderColor(col.id),
                            fontWeight: "bold",
                            align: "center",
                          }}
                        >
                          {col.label}
                        </TableCell>
                      ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.filter((col) => col.visible).length}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            p: 2,
                          }}
                        >
                          <CircularProgress size={24} />
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            Loading data...
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={columns.filter((col) => col.visible).length}
                        align="center"
                      >
                        <Typography variant="body2">
                          No data available
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {rows.map((row, idx) => (
                        <TableRow key={idx} hover>
                          {columns
                            .filter((col) => col.visible)
                            .map((col) => (
                              <TableCell
                                key={col.id}
                                sx={{
                                  backgroundColor: getCellColor(col.id),
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {col.id === "date"
                                  ? row[col.id]
                                  : typeof row[col.id] === "number"
                                  ? col.id.includes("Hours")
                                    ? `${Number(row[col.id]).toFixed(2)}h`
                                    : col.color === "purple"
                                    ? col.id === "numDeliveries" ||
                                      col.id === "tarShownTasks" ||
                                      col.id === "tarStartedTasks"
                                      ? Number(row[col.id])
                                      : Number(row[col.id]).toFixed(2)
                                    : formatNumber(Math.round(row[col.id]))
                                  : row[col.id] || "0"}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                      <TableRow>
                        {columns
                          .filter((col) => col.visible)
                          .map((col) => (
                            <TableCell
                              key={col.id}
                              sx={{
                                fontWeight: "bold",
                                backgroundColor: getHeaderColor(col.id),
                                whiteSpace: "nowrap",
                              }}
                            >
                              {col.id === "date"
                                ? "Summary"
                                : aggregates[col.id] !== undefined
                                ? col.id.includes("Hours")
                                  ? `${Number(aggregates[col.id]).toFixed(2)}h`
                                  : col.aggregate === "avg"
                                  ? Number(aggregates[col.id]).toFixed(2)
                                  : formatNumber(Math.round(aggregates[col.id]))
                                : ""}
                            </TableCell>
                          ))}
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default WoltDashboard;
