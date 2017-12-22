# frozen_string_literal: true

class UnsaveWorker
  include Sidekiq::Worker

  def perform(account_id, status_id)
    UnsaveService.new.call(Account.find(account_id), Status.find(status_id))
  rescue ActiveRecord::RecordNotFound
    true
  end
end
