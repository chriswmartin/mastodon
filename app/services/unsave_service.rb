# frozen_string_literal: true

class UnsaveService < BaseService
  def call(account, status)
    save = Save.find_by!(account: account, status: status)
    save.destroy!
    create_notification(save) unless status.local?
    save
  end

  private

  def create_notification(save)
    status = save.status

    if status.account.ostatus?
      NotificationWorker.perform_async(build_xml(save), save.account_id, status.account_id)
    elsif status.account.activitypub?
      ActivityPub::DeliveryWorker.perform_async(build_json(save), save.account_id, status.account.inbox_url)
    end
  end

  def build_json(save)
    Oj.dump(ActivityPub::LinkedDataSignature.new(ActiveModelSerializers::SerializableResource.new(
      save,
      serializer: ActivityPub::UndoLikeSerializer,
      adapter: ActivityPub::Adapter
    ).as_json).sign!(save.account))
  end

  def build_xml(save)
    OStatus::AtomSerializer.render(OStatus::AtomSerializer.new.unsave_salmon(save))
  end
end
