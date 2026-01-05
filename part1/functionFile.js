
async function checkWarehouseIds(idArray) {

  const query = `
        SELECT 
            input_id,
            (w.id IS NOT NULL) as exists
        FROM 
            UNNEST($1::int[]) AS input_id  -- Turns array [$1] into rows
        LEFT JOIN 
            warehouses w ON w.id = input_id
    `;

  const res = await pool.query(query, [idArray]);


  return res.rows;
}


async function createProduct(req, res) {
  try {
    // the json data is parsed and placed in req.body by middleware
    const { name, sku, price, warehouse_id,initial_quantity } = req.body
    // Validating the sent data is available or not
    if (!name || !sku || !price || warehouse_id.length == 0 || !initial_quantity) {
      res.status(400).json({
        message: "Data is Incomplete, Cannot process"
      })
      return
    }
    // Validating whether the data dosent break the Business logic
    // for price
    if (price <= 0 || initial_quantity<0) {
      res.status(400).json({
        message: "price and quantity cannot be lessthan or equal to 0"
      })  
      return
    }
    // for warehouse_id
    const warehouseVerified_id = await checkWarehouseIds(warehouse_id);
    for (var key of warehouseVerified_id) {
      if (key.exists == false) {
        res.status(400).json({
          message: `Invalid warehouse id ${key.input_id}`
        })
        return
      }
    }
    // Now begin with transaction

    let client = await pool.connect();
    try {

      // Start Transaction
      await client.query('BEGIN')
      // generating query
      const productQuery = `
            INSERT INTO products (name, sku, price, warehouse_ids) 
            VALUES ($1, $2, $3, $4::int[]) 
            RETURNING id
        `;
      const response = await client.query(productQuery, [
        name,
        sku,
        price,
        warehouse_id
      ]);
      const productId = response.rows[0].id;

      // product created now registering it in the inventory

      const inventoryQuery = `
            INSERT INTO inventory (product_id, warehouse_ids, quantity)
            VALUES ($1, $2::int[], $3)
        `;

      await client.query(inventoryQuery, [
        productId,
        warehouse_id,
        initial_quantity
      ]);

      // transaction completed now commiting to real db

      await client.query('COMMIT');
      return res.status(201).json({ message: "product created", productId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      // releasing the client whether the transaction executes of fails
      client.release();
    }




  } catch (err) {
    return res.status(500).json({ message: err })
  }
}

app.post('/api/products', createProduct)

