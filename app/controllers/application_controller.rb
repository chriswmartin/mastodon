# frozen_string_literal: true

class ApplicationController < ActionController::Base
  # Prevent CSRF attacks by raising an exception.
  # For APIs, you may want to use :null_session instead.
  protect_from_forgery with: :exception

  force_ssl if: :https_enabled?

  include Localized
  include UserTrackingConcern

  helper_method :current_account
  helper_method :current_session
  helper_method :current_flavour
  helper_method :current_skin
  helper_method :single_user_mode?

  rescue_from ActionController::RoutingError, with: :not_found
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActionController::InvalidAuthenticityToken, with: :unprocessable_entity
  rescue_from Mastodon::NotPermittedError, with: :forbidden

  before_action :store_current_location, except: :raise_not_found, unless: :devise_controller?
  before_action :check_suspension, if: :user_signed_in?

  def raise_not_found
    raise ActionController::RoutingError, "No route matches #{params[:unmatched_route]}"
  end

  private

  def https_enabled?
    Rails.env.production? && ENV['LOCAL_HTTPS'] == 'true'
  end

  def store_current_location
    store_location_for(:user, request.url)
  end

  def require_admin!
    redirect_to root_path unless current_user&.admin?
  end

  def require_staff!
    redirect_to root_path unless current_user&.staff?
  end

  def check_suspension
    forbidden if current_user.account.suspended?
  end

  def after_sign_out_path_for(_resource_or_scope)
    new_user_session_path
  end

  def pack(data, pack_name, skin = 'default')
    return nil unless pack?(data, pack_name)
    pack_data = {
      common: pack_name == 'common' ? nil : resolve_pack(data['name'] ? Themes.instance.flavour(current_flavour) : Themes.instance.core, 'common', skin),
      flavour: data['name'],
      pack: pack_name,
      preload: nil,
      skin: nil,
    }
    if data['pack'][pack_name].is_a?(Hash)
      pack_data[:common] = nil if data['pack'][pack_name]['use_common'] == false
      pack_data[:pack] = nil unless data['pack'][pack_name]['filename']
      if data['pack'][pack_name]['preload']
        pack_data[:preload] = [data['pack'][pack_name]['preload']] if data['pack'][pack_name]['preload'].is_a?(String)
        pack_data[:preload] = data['pack'][pack_name]['preload'] if data['pack'][pack_name]['preload'].is_a?(Array)
      end
      if skin != 'default' && data['skin'][skin]
        pack_data[:skin] = skin if data['skin'][skin].include?(pack_name)
      else  #  default skin
        pack_data[:skin] = 'default' if data['pack'][pack_name]['stylesheet']
      end
    end
    pack_data
  end

  def pack?(data, pack_name)
    if data['pack'].is_a?(Hash) && data['pack'].key?(pack_name)
      return true if data['pack'][pack_name].is_a?(String) || data['pack'][pack_name].is_a?(Hash)
    end
    false
  end

  def nil_pack(data, pack_name, skin = 'default')
    {
      common: pack_name == 'common' ? nil : resolve_pack(data['name'] ? Themes.instance.flavour(current_flavour) : Themes.instance.core, 'common', skin),
      flavour: data['name'],
      pack: nil,
      preload: nil,
      skin: nil,
    }
  end

  def resolve_pack(data, pack_name, skin = 'default')
    result = pack(data, pack_name, skin)
    unless result
      if data['name'] && data.key?('fallback')
        if data['fallback'].nil?
          return nil_pack(data, pack_name, skin)
        elsif data['fallback'].is_a?(String) && Themes.instance.flavour(data['fallback'])
          return resolve_pack(Themes.instance.flavour(data['fallback']), pack_name)
        elsif data['fallback'].is_a?(Array)
          data['fallback'].each do |fallback|
            return resolve_pack(Themes.instance.flavour(fallback), pack_name) if Themes.instance.flavour(fallback)
          end
        end
        return nil_pack(data, pack_name, skin)
      end
      return data.key?('name') && data['name'] != Setting.default_settings['flavour'] ? resolve_pack(Themes.instance.flavour(Setting.default_settings['flavour']), pack_name) : nil_pack(data, pack_name, skin)
    end
    result
  end

  def use_pack(pack_name)
    @core = resolve_pack(Themes.instance.core, pack_name)
    @theme = resolve_pack(Themes.instance.flavour(current_flavour), pack_name, current_skin)
  end

  protected

  def forbidden
    respond_with_error(403)
  end

  def not_found
    respond_with_error(404)
  end

  def gone
    respond_with_error(410)
  end

  def unprocessable_entity
    respond_with_error(422)
  end

  def single_user_mode?
    @single_user_mode ||= Rails.configuration.x.single_user_mode && Account.exists?
  end

  def current_account
    @current_account ||= current_user.try(:account)
  end

  def current_session
    @current_session ||= SessionActivation.find_by(session_id: cookies.signed['_session_id'])
  end

  def current_flavour
    return Setting.default_settings['flavour'] unless Themes.instance.flavours.include? current_user&.setting_flavour
    current_user.setting_flavour
  end

  def current_skin
    return 'default' unless Themes.instance.skins_for(current_flavour).include? current_user&.setting_skin
    current_user.setting_skin
  end

  def cache_collection(raw, klass)
    return raw unless klass.respond_to?(:with_includes)

    raw                    = raw.cache_ids.to_a if raw.is_a?(ActiveRecord::Relation)
    uncached_ids           = []
    cached_keys_with_value = Rails.cache.read_multi(*raw.map(&:cache_key))

    raw.each do |item|
      uncached_ids << item.id unless cached_keys_with_value.key?(item.cache_key)
    end

    klass.reload_stale_associations!(cached_keys_with_value.values) if klass.respond_to?(:reload_stale_associations!)

    unless uncached_ids.empty?
      uncached = klass.where(id: uncached_ids).with_includes.map { |item| [item.id, item] }.to_h

      uncached.each_value do |item|
        Rails.cache.write(item.cache_key, item)
      end
    end

    raw.map { |item| cached_keys_with_value[item.cache_key] || uncached[item.id] }.compact
  end

  def respond_with_error(code)
    respond_to do |format|
      format.any  { head code }
      format.html do
        set_locale
        render "errors/#{code}", layout: 'error', status: code
      end
    end
  end
end
