UPDATE "Merchants" SET "DispatchMode" = 3, "HexagonSizeMeters" = 1120, "MaxCourierDistanceKm" = 6, "MaxOrdersPerTour" = 2, "OrderBatchingTimeMinutes" = 15, "CrossRestaurantDistanceMeters" = 200 WHERE "Id" = '804c1bbd-70cf-47ae-8056-19c58d1deada' OR "Role" != 'CourierFirm';
SELECT "Id", "Name", "Role", "DispatchMode", "HexagonSizeMeters" FROM "Merchants";
