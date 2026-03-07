import { announcementText } from '../../config';

export default function AnnouncementBar() {
  return (
    <div className="bg-charcoal text-off-white text-center py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium">
      {announcementText}
    </div>
  );
}
