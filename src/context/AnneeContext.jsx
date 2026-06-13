import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { annees as anneesApi } from '../api'
import { useAuth } from './AuthContext'

const AnneeContext = createContext(null)

export function AnneeProvider({ children }) {
  const { user } = useAuth()
  const [anneeActive, setAnneeActive] = useState(null)
  const [allAnnees, setAllAnnees] = useState([])
  const [anneeSelectionnee, setAnneeSelectionnee] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    const [all, active] = await Promise.all([anneesApi.getAll(), anneesApi.getActive()])
    setAllAnnees(all || [])
    setAnneeActive(active || null)
    if (!anneeSelectionnee) setAnneeSelectionnee(active || null)
  }, [user])

  useEffect(() => { load() }, [load])

  const anneeId = anneeSelectionnee?.id || anneeActive?.id

  return (
    <AnneeContext.Provider value={{
      anneeActive, allAnnees, anneeSelectionnee, anneeId,
      setAnneeSelectionnee, reload: load,
    }}>
      {children}
    </AnneeContext.Provider>
  )
}

export function useAnnee() {
  return useContext(AnneeContext)
}
