# frozen_string_literal: true

class SharesController < ApplicationController
  layout 'modal'

  before_action :authenticate_user!
  before_action :set_pack
  before_action :set_body_classes

  def show
    serializable_resource = ActiveModelSerializers::SerializableResource.new(InitialStatePresenter.new(initial_state_params), serializer: InitialStateSerializer)
    @initial_state_json   = serializable_resource.to_json
  end

  private

  def initial_state_params
    {
      settings: Web::Setting.find_by(user: current_user)&.data || {},
      push_subscription: current_account.user.web_push_subscription(current_session),
      current_account: current_account,
      token: current_session.token,
      admin: Account.find_local(Setting.site_contact_username),
      text: params[:text],
    }
  end

  def set_pack
    use_pack 'share'
  end

  def set_body_classes
    @body_classes = 'compose-standalone'
  end
end
