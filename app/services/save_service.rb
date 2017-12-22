# frozen_string_literal: true

class SaveService < BaseService
  include Authorization

  # Save a status
  # @param [Account] account
  # @param [Status] status
  # @return [Save]
  def call(account, status)
    authorize_with account, status, :show?

    save = Save.find_by(account: account, status: status)

    return save unless save.nil?

    save = Save.create!(account: account, status: status)
    create_notification(save)
    save
  end

  private

  def create_notification(save)
    status = save.status

    if status.account.local?
      NotifyService.new.call(status.account, save)
    elsif status.account.ostatus?
      NotificationWorker.perform_async(build_xml(save), save.account_id, status.account_id)
    elsif status.account.activitypub?
      ActivityPub::DeliveryWorker.perform_async(build_json(save), save.account_id, status.account.inbox_url)
    end
  end

  def build_json(save)
    Oj.dump(ActivityPub::LinkedDataSignature.new(ActiveModelSerializers::SerializableResource.new(
      save,
      serializer: ActivityPub::LikeSerializer,
      adapter: ActivityPub::Adapter
    ).as_json).sign!(save.account))
  end

  def build_xml(save)
    OStatus::AtomSerializer.render(OStatus::AtomSerializer.new.save_salmon(save))
  end
end
