"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ExhibitionIndexPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/exhibitions/${id}/overview`);
    }
  }, [id, router]);

  return null;
}
