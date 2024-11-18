# frozen_string_literal: true

module ActionCable
  module SubscriptionAdapter
    class BroadcastChannel < Base
      def broadcast(channel, payload)
        Rails.logger.debug "Broadcasting to #{channel}"

        begin
          JS.global[external_interface].broadcast(channel, payload)
        rescue => e
          Rails.logger.error "Failed to broadcast to #{channel}: #{e.message}"
        end
      end

      private

      def external_interface
        @external_interface ||= config_options.fetch(:external_interface, "actionCableBroadcaster")
      end

      def config_options
        @config_options ||= config.cable.deep_symbolize_keys
      end
    end
  end
end
