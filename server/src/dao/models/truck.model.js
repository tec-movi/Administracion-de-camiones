const collection = 'trucks'

const TruckModel = {
  table: collection,
  fields: {
    id: 'id',
    plate_number: 'plate_number',
    model: 'model',
    year: 'year',
    total_mileage: 'total_mileage',
    last_maintenance_mileage: 'last_maintenance_mileage',
    maintenance_threshold: 'maintenance_threshold',
    status: 'status'
  }
}

export default TruckModel
