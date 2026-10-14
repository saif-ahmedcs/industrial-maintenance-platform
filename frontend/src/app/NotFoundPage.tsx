import { useNavigate } from 'react-router-dom';
import { Button } from '../design/Button';
import { EmptyState } from '../design/EmptyState';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <EmptyState
      title="Page not found"
      body="The page you're looking for doesn't exist or may have moved."
      action={
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to overview
        </Button>
      }
    />
  );
}
