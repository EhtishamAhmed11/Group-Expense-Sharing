"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Box,
  Container,
} from "@mui/material";
import { History, Eye, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const API_URL = "http://localhost:3005/api/settlements/settlements";

const SettlementHistory = () => {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setSettlements(data.data.settlements || []);
      else toast.error("Failed to fetch settlement history");
    } catch (err) {
      console.error(err);
      toast.error("Error fetching settlement history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "disputed":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "confirmed":
        return <TrendingUp className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "disputed":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const renderSettlementTable = (list, title, icon) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="mb-8 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
        <CardHeader
          title={
            <Box className="flex items-center gap-2">
              {icon}{" "}
              <Typography variant="h6" className="font-semibold text-gray-800">
                {title}
              </Typography>
            </Box>
          }
          subheader={
            <Typography variant="body2" className="text-gray-500">
              {list.length} settlement{list.length !== 1 ? "s" : ""}
            </Typography>
          }
        />
        <CardContent className="pt-0">
          {list.length === 0 ? (
            <Box className="text-center py-8">
              <Typography variant="body2" className="text-gray-500">
                No {title.toLowerCase()}
              </Typography>
            </Box>
          ) : (
            <TableContainer
              component={Paper}
              className="shadow-none border border-gray-200 rounded-xl"
            >
              <Table>
                <TableHead className="bg-gray-50">
                  <TableRow>
                    <TableCell className="font-semibold text-gray-700">
                      Description
                    </TableCell>
                    <TableCell className="font-semibold text-gray-700">
                      Amount
                    </TableCell>
                    <TableCell className="font-semibold text-gray-700">
                      Status
                    </TableCell>
                    <TableCell className="font-semibold text-gray-700">
                      Date
                    </TableCell>
                    <TableCell className="font-semibold text-gray-700">
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map((s) => (
                    <motion.tr
                      key={s.id}
                      className="hover:bg-gray-50 transition-all cursor-pointer"
                      whileHover={{ scale: 1.01 }}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          className="font-medium text-gray-800"
                        >
                          {s.displayText}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          className="font-semibold text-gray-900"
                        >
                          ${s.amount}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.status}
                          color={getStatusColor(s.status)}
                          size="small"
                          icon={getStatusIcon(s.status)}
                          className="capitalize"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" className="text-gray-600">
                          {s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString()
                            : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          component={Link}
                          to={`/settlements/${s.id}`}
                          variant="outlined"
                          size="small"
                          startIcon={<Eye className="w-4 h-4" />}
                          className="text-black border-black hover:bg-gray-100 rounded-lg"
                        >
                          View
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <Box className="flex flex-col items-center justify-center min-h-64 py-16">
        <CircularProgress />
        <Typography variant="body2" className="mt-3 text-gray-600">
          Loading settlement history...
        </Typography>
      </Box>
    );
  }

  const incoming = settlements.filter(
    (s) => s.direction === "incoming" && s.status === "pending"
  );
  const outgoing = settlements.filter(
    (s) => s.direction === "outgoing" && s.status === "pending"
  );
  const confirmed = settlements.filter((s) => s.status === "confirmed");

  return (
    <Container maxWidth="lg" className="py-10">
      <Box className="mb-8 text-center">
        <Typography
          variant="h4"
          className="font-bold flex items-center justify-center gap-3 text-gray-900"
        >
          <History className="w-8 h-8 text-black" /> Settlement History
        </Typography>
        <Typography variant="body1" className="text-gray-600 mt-2">
          Track and manage all your settlement transactions
        </Typography>
      </Box>

      <Box sx={{ width: "100%", maxWidth: "1100px" }}>
        {renderSettlementTable(
          incoming,
          "Incoming Settlements (Waiting for You)",
          <TrendingUp className="w-5 h-5 text-green-600" />
        )}

        {renderSettlementTable(
          outgoing,
          "Outgoing Settlements (Waiting for Others)",
          <TrendingDown className="w-5 h-5 text-orange-600" />
        )}

        {renderSettlementTable(
          confirmed,
          "Confirmed Settlements",
          <TrendingUp className="w-5 h-5 text-blue-600" />
        )}
      </Box>
    </Container>
  );
};

export default SettlementHistory;
