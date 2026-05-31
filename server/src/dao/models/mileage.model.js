const collection = 'mileage_logs'

const MileageModel = {
  table: collection,
  fields: {
    id: 'id',
    truck_id: 'truck_id',
    driver_id: 'driver_id',
    mileage_value: 'mileage_value',
    registration_date: 'registration_date'
  }
}

export default MileageModel
