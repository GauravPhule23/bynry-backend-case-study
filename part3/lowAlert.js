const getLowStockAlerts = async (req, res) => {
  try {
    const { companyId } = req.params;

    //Fetch ALL products for this company

    const products = await Product.find({ company_id: companyId });

    const alerts = [];

    //Loop through each product one by one
    for (const product of products) {

      //Skip products that haven't sold in 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (product.last_sold_at && product.last_sold_at < thirtyDaysAgo) {
        continue;
      }

      // Query Inventory for THIS specific product
      // (Note: This queries the DB once for every product)
      const inventoryItems = await Inventory.find({ product_id: product._id })
        .populate('warehouse_id');

      // Sum up the total stock across all warehouses
      let totalStock = 0;
      let warehouseDetails = [];

      inventoryItems.forEach(item => {
        totalStock += item.quantity;
        warehouseDetails.push({
          id: item.warehouse_id._id,
          name: item.warehouse_id.name
        });
      });

      //Compare with Threshold
      if (totalStock < product.min_threshold) {

        // Calculate days until stockout
        // Avoid division by zero: if daily sales is 0 or missing, default to 1
        const velocity = product.avg_daily_sales || 1;
        const daysLeft = Math.floor(totalStock / velocity);

        // Add to alert list
        alerts.push({
          product_id: product._id,
          product_name: product.name,
          sku: product.sku,
          current_stock: totalStock,
          threshold: product.min_threshold,
          days_until_stockout: daysLeft,
          // Showing the first warehouse as primary location for the alert
          warehouse_name: warehouseDetails.length > 0 ? warehouseDetails[0].name : 'Multiple Locations',
          supplier: product.supplier // Assuming supplier info is embedded in Product
        });
      }
    }

    // Return the final list
    return res.status(200).json({
      alerts: alerts,
      total_alerts: alerts.length
    });

  } catch (err) {
    console.error("Error fetching alerts:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

app.get('/api/companies/{company_id}/alerts/low-stock', getLowStockAlerts)