Rails.application.config.filter_parameters += %i[
  passw secret token key cookie jwt authorization
  credit_card ssn email phone
]
