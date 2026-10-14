import { useNavigate } from 'react-router-dom';
import { Button } from '../design/Button';
import { EmptyState } from '../design/EmptyState';

export default function NotPermittedPage() {
  const navigate = useNavigate();

  return (
    <EmptyState
      title="Not permitted"
      body="You do not have permission to view this page. If you think this is wrong, ask an administrator."
      action={
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to overview
        </Button>
      }
    />
  );
}
