import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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

const CourierSearch = () => {
  const navigate = useNavigate();
  const [courierId, setCourierId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add courierId to visible columns
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    courierId: true,
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

  // Add courierId to columns definition
  const columns = [
    {
      id: "date",
      label: "Date",
      visible: visibleColumns.date,
      aggregate: null,
      color: "White",
    },
    {
      id: "courierId",
      label: "Courier ID",
      visible: visibleColumns.courierId,
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

  const fetchAllCouriers = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/couriers/all-stats`);
      const data = await response.json();

      console.log(data.data[0]);

      if (data.success) {
        const formattedData = data.data.map((courierData) => ({
          date: new Date(courierData.date).toISOString().slice(5, 10),
          courierId: courierData.courierId,
          tar: courierData.tar?.value || 0,
          tcr: courierData.tcr?.value || 0,
          dph: courierData.dph?.value || 0,
          onlineHours: courierData.onlineHours?.value || 0,
          onTaskHours: courierData.onTaskHours?.value || 0,
          idleHours: courierData.idleHours?.value || 0,
          numDeliveries: courierData.numDeliveries?.value || 0,
          tarShownTasks: courierData.tarShownTasks?.value || 0,
          tarStartedTasks: Number(courierData.tarStartedTasks?.value) || 0,
          taskDistanceCost:
            (courierData.earnings || [])
              .filter(
                (e) =>
                  e.transactionType === "transaction_type_task_distance_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          shiftGuarantee:
            (courierData.earnings || [])
              .filter(
                (e) => e.transactionType === "transaction_type_shift_guarantee"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          upfrontPricingAdjustment:
            (courierData.earnings || [])
              .filter(
                (e) =>
                  e.transactionType ===
                  "transaction_type_upfront_pricing_adjustment"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          taskPickupDistanceCost:
            (courierData.earnings || [])
              .filter(
                (e) =>
                  e.transactionType ===
                  "transaction_type_task_pickup_distance_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          taskBaseCost:
            (courierData.earnings || [])
              .filter(
                (e) => e.transactionType === "transaction_type_task_base_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          tip:
            (courierData.earnings || [])
              .filter((e) => e.transactionType === "transaction_type_tip")
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          taskCapabilityCost:
            (courierData.earnings || [])
              .filter(
                (e) =>
                  e.transactionType === "transaction_type_task_capability_cost"
              )
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          manual:
            (courierData.earnings || [])
              .filter((e) => e.transactionType === "transaction_type_manual")
              .reduce((sum, e) => sum + e.amount, 0) / 1000,
          cashReceived: courierData.cashBalance?.amount || 0,
        }));

        setRows(formattedData);
      } else {
        setRows([]);
      }
    } catch (error) {
      console.error("Error fetching courier data:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch all courier data on component mount
  useEffect(() => {
    fetchAllCouriers();
  }, [fetchAllCouriers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (courierId) {
      // Navigate to WoltDashboard with the courier ID
      navigate(`/dashboard?courierId=${courierId}`);
    }
  };

  const handleRowClick = (row) => {
    // Navigate to WoltDashboard when a row is clicked
    navigate(`/dashboard?courierId=${row.courierId}`);
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

  const formatNumber = (number) => {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2, maxWidth: "100%" }}>
        <Card sx={{ mb: 3 }}>
          <CardHeader title="Courier Search" />
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Grid container spacing={2} sx={{ maxWidth: "800px" }}>
                  <Grid
                    item
                    xs={12}
                    md={8}
                    sx={{ display: "flex", alignItems: "flex-start" }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      value={courierId}
                      onChange={(e) => setCourierId(e.target.value)}
                      placeholder="Enter courier ID to view detailed dashboard"
                      helperText="Enter ID and click Search to view detailed dashboard"
                      label="Courier ID"
                      sx={{ mt: 0 }}
                    />
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={4}
                    sx={{ display: "flex", alignItems: "flex-start" }}
                  >
                    <Button
                      variant="contained"
                      type="submit"
                      fullWidth
                      sx={{ height: 40, mt: 1 }}
                      disabled={!courierId}
                    >
                      View Detailed Dashboard
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </form>

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

            <TableContainer
              component={Paper}
              sx={{
                overflowX: "auto",
                maxHeight: "600px", // Set a max height to enable vertical scrolling
                "& .MuiTableHead-root": {
                  position: "sticky",
                  top: 0,
                  zIndex: 1, // Ensure header stays above content when scrolling
                },
              }}
            >
              {" "}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {columns
                      .filter((col) => col.visible)
                      .map((col) => (
                        <TableCell
                          key={col.id}
                          sx={{
                            backgroundColor: getHeaderColor(col.id),
                            fontWeight: "bold",
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
                        <TableRow
                          key={idx}
                          hover
                          onClick={() => handleRowClick(row)}
                          sx={{ cursor: "pointer", p: 0 }}
                        >
                          {columns
                            .filter((col) => col.visible)
                            .map((col) => (
                              <TableCell
                                key={col.id}
                                sx={{
                                  backgroundColor: getCellColor(col.id),
                                  whiteSpace: "nowrap",
                                  textAlign: "right",
                                }}
                              >
                                {col.id === "date"
                                  ? row[col.id]
                                  : col.id === "courierId"
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
                                  ? Number(aggregates[col.id]).toFixed(2) + "h"
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

export default CourierSearch;
