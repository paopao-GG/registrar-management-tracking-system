import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Student {
  _id: string;
  name: string;
  course: string;
  yearLevel: number;
}

export function useStudentSearch(query: string) {
  const [results, setResults] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get('/students', { params: { q: query } });
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, isLoading };
}
