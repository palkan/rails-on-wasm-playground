module ActionCable
  # An HTTP version of command executor for Action Cable
  class CommandsController < ApplicationController
    skip_before_action :verify_authenticity_token

    using(Module.new do
      # Add #load method to Subscriptions to create a channel instance.
      # (Code borrowed from anycable-rails)
      refine ::ActionCable::Connection::Subscriptions do
        def load(identifier)
          return subscriptions[identifier] if subscriptions[identifier]

          subscription = subscription_from_identifier(identifier)
          raise "Channel not found: #{ActiveSupport::JSON.decode(identifier).fetch("channel")}" unless subscription

          subscriptions[identifier] = subscription
        end
      end
    end)

    def open
      connection.handle_open

      respond_with_socket_state
    end

    def message
      command_params = params
      if on_wasm?
        command_params = JSON.parse(request.raw_post).with_indifferent_access
      end

      command = command_params[:command]
      identifier = command_params[:identifier]
      data = command_params[:data]

      # Initialize the channel instance
      connection.subscriptions.load(identifier) unless command == "subscribe"

      connection.handle_incoming({"command" => command, "identifier" => identifier, "data" => data}.compact)

      respond_with_socket_state(identifier:)
    end

    def close
      head :ok
    end

    private

    def respond_with_socket_state(**other)
      render json: {transmissions: socket.transmissions, streams: socket.streams, state: {}, stopped_streams: socket.stopped_streams}.merge(other)
    end

    class ServerInterface < SimpleDelegator
      attr_accessor :pubsub
    end

    class Socket
      #== Action Cable socket interface ==
      attr_reader :logger, :protocol, :request
      attr_reader :transmissions, :streams, :stopped_streams, :coder, :server

      delegate :env, to: :request
      delegate :worker_pool, :logger, :perform_work, to: :server

      def initialize(request, server, coder: ActiveSupport::JSON)
        @request = request
        @coder = coder
        @server = server
        @transmissions = []
        @streams = []
        @stopped_streams = []
      end

      def transmit(data)
        transmissions << coder.encode(data)
      end

      def subscribe(channel, handler, on_success = nil)
        streams << channel
        on_success&.call
      end

      def unsubscribe(channel, handler)
        stopped_streams << channel
      end

      def close
      end
    end

    def socket
      @socket ||= begin
        state = request.headers["HTTP_X_CABLE_STATE"].then do |rawState|
          next unless rawState
          JSON.parse(rawState).with_indifferent_access
        end

        Socket.new(request, server)
      end
    end

    def connection
      @connection ||= begin
        srv = ServerInterface.new(socket)
        srv.pubsub = socket
        server.config.connection_class.call.new(srv, socket)
      end
    end

    def server = ActionCable.server
  end
end
