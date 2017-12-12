# frozen_string_literal: true

class Api::V1::Lists::PinsController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :write }
  before_action :require_user!
  before_action :set_list

  respond_to :json

  def create
    ListPin.create!(account: current_account, list: @list)
    render json: @list, serializer: REST::ListSerializer
  end

  def destroy
    pin = ListPin.find_by(account: current_account, list: @list)
    pin&.destroy!
    render json: @list, serializer: REST::ListSerializer
  end

  private

  def set_list
    @list = List.find(params[:list_id])
  end
end
