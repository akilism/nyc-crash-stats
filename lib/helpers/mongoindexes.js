db.crashes.ensureIndex({'unique_key': 1}, {unique: true})
db.crashes.ensureIndex({'date': 1})
db.crashes.ensureIndex({'loc': '2dsphere'})
db.crashes.ensureIndex({'loc': '2dsphere', date: 1})
