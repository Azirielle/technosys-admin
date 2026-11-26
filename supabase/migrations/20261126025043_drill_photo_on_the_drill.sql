-- Round 5 P7 (data): the "Digital Manifold Gauge" showed a photo of a drill. Give that photo to the DeWalt drill
-- (which had none) and leave the gauge without a photo until the Coordinator adds a real one.
update public.tools set image_url = (select image_url from public.tools where name = 'Digital Manifold Gauge'), updated_at = now()
  where name = 'DeWalt 20V Max Hammer Drill' and image_url is null;
update public.tools set image_url = null, updated_at = now() where name = 'Digital Manifold Gauge';
