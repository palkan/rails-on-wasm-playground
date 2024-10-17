# frozen_string_literal: true

class Todo < ApplicationRecord
  after_commit do
    broadcast_refresh
    broadcast_refresh_to "todos"
  end
end
