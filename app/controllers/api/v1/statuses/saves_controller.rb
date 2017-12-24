# frozen_string_literal: true

class Api::V1::Statuses::SavesController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :write }
  before_action :require_user!
  before_action :set_status

  respond_to :json

  def create
    SavedStatus.create!(account: current_account, status: @status)
    render json: @status, serializer: REST::StatusSerializer
  end

  def destroy
    saved = SavedStatus.find_by(account: current_account, status: @status)
    saved&.destroy!
    render json: @status, serializer: REST::StatusSerializer
  end

  private

  def set_status
    @status = Status.find(params[:status_id])
  end
end
