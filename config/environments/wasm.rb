# frozen_string_literal: true

require_relative "production"

class BroadcastChannelSubscriptionAdapter < ActionCable::SubscriptionAdapter::Base
  def broadcast(channel, payload)
    Rails.logger.info "Broadcasting to #{channel}"
    begin
      JS.global["actionCableBroadcaster"].broadcast(channel, payload)
    rescue => e
      Rails.logger.error "Failed to broadcast to #{channel}: #{e.message}"
    end
  end
end

ActionCable.server.config.pubsub_adapter = "BroadcastChannelSubscriptionAdapter"

Rails.application.configure do
  config.enable_reloading = false

  config.assume_ssl = false
  config.force_ssl  = false

  # FIXME: Tags are not being reset right now
  config.log_tags = []

  if ENV["DEBUG"] == "1"
    config.consider_all_requests_local = true
    config.action_dispatch.show_exceptions = :none
    config.log_level = :debug
    config.logger = Logger.new($stdout)
  end

  config.cache_store = :memory_store
  config.active_job.queue_adapter = :inline
  config.action_mailer.delivery_method = :null
  config.action_cable.url = "local:///action_cable"

  if config.respond_to?(:active_storage)
    config.active_storage.variant_processor = :null
  end

  # Do not use the same secret key base in a local app (for security reasons)
  config.secret_key_base = "wasm-secret"
  # Use a different session cookie name to avoid conflicts
  config.session_store :cookie_store, key: "_local_session"
end
