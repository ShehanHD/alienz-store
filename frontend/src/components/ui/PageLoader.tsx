import { Spinner, Center } from '@shehandon/vcs-ui'

export function PageLoader() {
  return (
    <Center minHeight="40vh" role="status" aria-label="Loading">
      <Spinner size="lg" />
    </Center>
  )
}
