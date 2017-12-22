# frozen_string_literal: true

class Api::V1::Statuses::SavesController < Api::BaseController
  include Authorization

  before_action -> { doorkeeper_authorize! :write }
  before_action :require_user!

  respond_to :json

  def create
    @status = requested_status
    render json: @status, serializer: REST::StatusSerializer
  end

  def destroy
    @status = requested_status
    @saves_map = { @status.id => false }

    UnsaveWorker.perform_async(current_user.account_id, @status.id)

    render json: @status, serializer: REST::StatusSerializer
    #render json: @status, serializer: REST::StatusSerializer, relationships: StatusRelationshipsPresenter.new([@status], current_user&.account_id, saves_map: @saves_map)
  end

  private

  def saved_status
    service_result.status.reload
  end

  def service_result
    SavedService.new.call(current_user.account, requested_status)
  end

  def requested_status
    Status.find(params[:status_id])
  end
end
