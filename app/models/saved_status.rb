# frozen_string_literal: true
# == Schema Information
#
# Table name: saved_statuses
#
#  id         :bigint           not null, primary key
#  account_id :integer          not null
#  status_id  :bigint           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class SavedStatus < ApplicationRecord
  belongs_to :account, required: true
  belongs_to :status, required: true
end
