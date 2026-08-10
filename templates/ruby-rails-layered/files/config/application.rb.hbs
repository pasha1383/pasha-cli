require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"

Bundler.require(*Rails.groups)

module {{pascalCase projectName}}
  class Application < Rails::Application
    config.load_defaults 7.2
    config.api_only = true

    config.autoload_lib(ignore: %w[assets tasks])

    config.generators do |g|
      g.test_framework :rspec
      g.fixture_replacement :factory_bot, dir: "spec/factories"
    end

    config.time_zone = "UTC"
    config.active_record.default_timezone = :utc

    config.filter_parameters += %i[password token secret]
  end
end
