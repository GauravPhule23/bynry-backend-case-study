

const schema = {
  Product: {
    id: { type: Integer, required: true, unique: true, primaryKey, serial },
    name:{type:String,required:true},
    sku: {type:String,unique:true,required:true},
    price: {type:Integer,required:true}, // constraints price > 0
    warehouses: [{type:Integer, required:true, ref:Warehouse}],
    category:{type:String}
  },

  Batch: {
    id: { type: Integer, required: true, unique: true, primaryKey, serial },
    name: {type:String,required: true},
    quantity: {type: Integer,required: true},
    productId: {type: Integer, required: true, ref:Product}
  },

  Inventory: {
    id: { type: Integer, required: true, unique: true, primaryKey, serial },
    batchId: {type: Integer, required: true,ref:Batch},
    warehouseId: {type: Integer, required: true,ref:Warehouse},
    quantity: {type: Integer,required: true}

  },
  // constraints sum of quantity of same inventory should be less than or equal to BatchId.quantity
  // constraints sum of quantity of same warehouseId should be less than or equal to Warehouse.capacity

  warehouse: {
    id: { type: Integer, required: true, unique: true, primaryKey, serial },
    name: {type:String,required: true},
    productLists: [{type: Integer, required: true, ref:Product}],
    capacity: {type: Integer,required: true}
  }
}