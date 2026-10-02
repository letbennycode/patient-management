import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useDeletePatient } from '@/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getErrorMessage } from '@/lib/errors'

interface Props {
  patientId: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePatientDialog({ patientId, name, open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const deletePatient = useDeletePatient(patientId)

  const confirm = () =>
    deletePatient.mutate(undefined, {
      onSuccess: () => {
        toast.success('Patient deleted')
        navigate('/patients')
      },
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) deletePatient.reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete patient</DialogTitle>
          <DialogDescription>
            Delete {name}? This also deletes their notes and can't be undone.
          </DialogDescription>
        </DialogHeader>
        {deletePatient.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(deletePatient.error)}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deletePatient.isPending}>
            {deletePatient.isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
