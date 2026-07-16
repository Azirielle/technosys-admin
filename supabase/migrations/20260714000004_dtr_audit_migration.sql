-- Change default photo_status to auto_accepted
alter table time_logs alter column photo_status set default 'auto_accepted';

-- Update all existing 'pending' to 'auto_accepted'
update time_logs set photo_status = 'auto_accepted' where photo_status = 'pending';
